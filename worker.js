// Cloudflare Worker — Proxy Geodis + TNT
const GEODIS_LOGIN = '2235572$';
const GEODIS_KEY   = '35a654a41c7045d8adbea5170210cdf8';
const LANG         = 'fr';
const TNT_LOGIN    = 'inventaire@izac.fr';
const TNT_PASSWORD = 'IZAC2025';
const TNT_ACCOUNTS = ['03817770','03817790','08917750','03810430','03817792'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function sha256hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
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

function tntSoap(accountNumber, reference) {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cxf="http://cxf.ws.app.tnt.fr/">
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
         <reference>${reference}</reference>
      </cxf:trackingByReference>
   </soapenv:Body>
</soapenv:Envelope>`;
}

async function tntTrackByRef(reference) {
  // Essaie tous les comptes en parallèle
  const results = await Promise.all(TNT_ACCOUNTS.map(async (account) => {
    try {
      const resp = await fetch('http://www.tnt.fr/service/', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': '""' },
        body: tntSoap(account, reference)
      });
      const xml = await resp.text();
      // Vérifie si la réponse contient un colis
      if (xml.includes('<consignmentNumber>')) {
        return { account, xml };
      }
      return null;
    } catch(e) {
      return null;
    }
  }));
  // Retourne le premier résultat valide
  return results.find(r => r !== null) || null;
}

function parseParcel(xml, account) {
  const get = (tag) => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
    return match ? match[1] : '';
  };
  const getAll = (tag) => {
    const matches = [...xml.matchAll(new RegExp(`<${tag}>(.*?)<\/${tag}>`, 'g'))];
    return matches.map(m => m[1]);
  };
  return {
    account,
    consignmentNumber: get('consignmentNumber'),
    reference: get('reference'),
    shortStatus: get('shortStatus'),
    statusCode: get('statusCode'),
    longStatus: getAll('longStatus').join(' — '),
    weight: get('weight'),
    service: get('service'),
    deliveryDate: get('deliveryDate'),
    requestDate: get('requestDate'),
    primaryPODUrl: get('primaryPODUrl'),
    receiverName: get('name'),
    receiverCity: get('city'),
    receiverZip: get('zipCode'),
    receiverAddress: get('address1'),
    senderName: xml.match(/<sender>[\s\S]*?<name>(.*?)<\/name>/)?.[1] || '',
    senderCity: xml.match(/<sender>[\s\S]*?<city>(.*?)<\/city>/)?.[1] || '',
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === '/api/ping') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Geodis - recherche envois
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

    // TNT - tracking par référence BL (essaie tous les comptes)
    if (url.pathname === '/api/tnt/ref' && request.method === 'POST') {
      try {
        const { reference } = await request.json();
        const result = await tntTrackByRef(reference);
        if (!result) {
          return new Response(JSON.stringify({ found: false, reference }), {
            headers: { ...CORS, 'Content-Type': 'application/json' }
          });
        }
        const parcel = parseParcel(result.xml, result.account);
        return new Response(JSON.stringify({ found: true, ...parcel }), {
          headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // TNT - tracking par lot de références BL
    if (url.pathname === '/api/tnt/batch' && request.method === 'POST') {
      try {
        const { references } = await request.json();
        const results = await Promise.all(
          references.map(async (ref) => {
            const result = await tntTrackByRef(ref);
            if (!result) return { found: false, reference: ref };
            return { found: true, reference: ref, ...parseParcel(result.xml, result.account) };
          })
        );
        return new Response(JSON.stringify({ results }), {
          headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { status: 404, headers: CORS });
  }
};
