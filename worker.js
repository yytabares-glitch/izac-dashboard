// Cloudflare Worker — Proxy Geodis + TNT
// Déploie sur https://izac-dashboard.yytabares.workers.dev

const GEODIS_LOGIN = '2235572$';
const GEODIS_KEY   = '35a654a41c7045d8adbea5170210cdf8';
const LANG         = 'fr';
const TNT_LOGIN    = 'inventaire@izac.fr';
const TNT_PASSWORD = 'IZAC2025';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function sha256hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function geodisRequest(service, body) {
  const timestamp = (Math.floor(Date.now() / 1000) * 1000).toString();
  const inlineBody = JSON.stringify(body);
  const message = GEODIS_KEY + ';' + GEODIS_LOGIN + ';' + timestamp + ';' + LANG + ';' + service + ';' + inlineBody;
  const hash = await sha256hex(message);
  const serviceHeader = GEODIS_LOGIN + ';' + timestamp + ';' + LANG + ';' + hash;

  const resp = await fetch('https://espace-client.geodis.com/services/' + service, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GEODIS-Service': serviceHeader,
      'Accept': 'application/json'
    },
    body: inlineBody
  });
  return resp.json();
}

async function tntRequest(parcelNumber) {
  const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cxf="http://cxf.ws.app.tnt.fr/">
   <soapenv:Header>
      <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
         <wsse:UsernameToken>
            <wsse:Username>${TNT_LOGIN}</wsse:Username>
            <wsse:Password>${TNT_PASSWORD}</wsse:Password>
         </wsse:UsernameToken>
      </wsse:Security>
   </soapenv:Header>
   <soapenv:Body>
      <cxf:trackingByConsignment>
         <parcelNumber>${parcelNumber}</parcelNumber>
      </cxf:trackingByConsignment>
   </soapenv:Body>
</soapenv:Envelope>`;

  const resp = await fetch('http://www.tnt.fr/service/', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': '""'
    },
    body: soap
  });
  return resp.text();
}

async function tntByDate(accountNumber, dateDebut, dateFin) {
  // TNT ne supporte pas la recherche par date via API
  // On utilise trackingByReference avec le compte
  const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cxf="http://cxf.ws.app.tnt.fr/">
   <soapenv:Header>
      <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
         <wsse:UsernameToken>
            <wsse:Username>${TNT_LOGIN}</wsse:Username>
            <wsse:Password>${TNT_PASSWORD}</wsse:Password>
         </wsse:UsernameToken>
      </wsse:Security>
   </soapenv:Header>
   <soapenv:Body>
      <cxf:trackingByReference>
         <accountNumber>${accountNumber}</accountNumber>
         <reference></reference>
      </cxf:trackingByReference>
   </soapenv:Body>
</soapenv:Envelope>`;

  const resp = await fetch('http://www.tnt.fr/service/', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': '""'
    },
    body: soap
  });
  return resp.text();
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // Ping
    if (url.pathname === '/api/ping') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Geodis - recherche envois par date
    if (url.pathname === '/api/envois' && request.method === 'POST') {
      try {
        const { dateDebut, dateFin, noRecepisse, reference1, nomDest } = await request.json();
        const body = {};
        if (dateDebut)   body.dateDepartDebut = dateDebut;
        if (dateFin)     body.dateDepartFin   = dateFin;
        if (noRecepisse) body.noRecepisse     = noRecepisse;
        if (reference1)  body.reference1      = reference1;
        if (nomDest)     body.nomDest         = nomDest;
        const result = await geodisRequest('api/zoomclient/recherche-envois', body);
        return new Response(JSON.stringify(result), {
          headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // Geodis - recherche nos suivis
    if (url.pathname === '/api/nos-suivis' && request.method === 'POST') {
      try {
        const { typeRecherche, listReferences } = await request.json();
        const result = await geodisRequest('api/zoomclient/recherche-nos-suivis', { typeRecherche, listReferences });
        return new Response(JSON.stringify(result), {
          headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // TNT - tracking par bon de transport
    if (url.pathname === '/api/tnt/tracking' && request.method === 'POST') {
      try {
        const { parcelNumber } = await request.json();
        const xml = await tntRequest(parcelNumber);
        return new Response(xml, {
          headers: { ...CORS, 'Content-Type': 'text/xml' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // TNT - tracking par compte
    if (url.pathname === '/api/tnt/bydate' && request.method === 'POST') {
      try {
        const { accountNumber, dateDebut, dateFin } = await request.json();
        const xml = await tntByDate(accountNumber, dateDebut, dateFin);
        return new Response(xml, {
          headers: { ...CORS, 'Content-Type': 'text/xml' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve static files from public/
    return new Response('Not found', { status: 404, headers: CORS });
  }
};
