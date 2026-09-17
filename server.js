const express = require('express');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GEODIS_LOGIN = 'transport@izac.fr';
const GEODIS_KEY   = '73bd9ee05e6f447f8237631f6027a9be';
const LANG         = 'fr';

function geodisRequest(service, body) {
  return new Promise((resolve, reject) => {
    const timestamp  = Date.now().toString();
    const inlineBody = JSON.stringify(body);
    const message    = GEODIS_KEY + ';' + GEODIS_LOGIN + ';' + timestamp + ';' + LANG + ';' + service + ';' + inlineBody;
    const hash       = crypto.createHash('sha256').update(message, 'utf8').digest('hex');
    const serviceHeader = GEODIS_LOGIN + ';' + timestamp + ';' + LANG + ';' + hash;

    console.log('→ X-GEODIS-Service header utilisé');
    console.log('→ message:', message.slice(0, 120));

    const options = {
      hostname: 'espace-client.geodis.com',
      path: '/services/' + service,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(inlineBody, 'utf8'),
        'X-GEODIS-Service': serviceHeader,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        console.log('← status:', res.statusCode);
        console.log('← body:', raw.slice(0, 500));
        try { resolve(JSON.parse(raw)); }
        catch(e) { resolve({ error: 'Parse error', raw }); }
      });
    });

    req.on('error', err => { console.error('← error:', err.message); reject(err); });
    req.write(inlineBody);
    req.end();
  });
}

app.post('/api/envois', async (req, res) => {
  try {
    const { dateDebut, dateFin, noRecepisse, reference1, nomDest } = req.body;
    const body = {
      dateDepart: '',
      dateDepartDebut: dateDebut || '',
      dateDepartFin: dateFin || '',
      noRecepisse: noRecepisse || '',
      reference1: reference1 || '',
      noSuivi: '',
      cabColis: '',
      codeSa: '',
      codeClient: '',
      codeProduit: '',
      typePrestation: '',
      dateLivraison: '',
      refDest: '',
      nomDest: nomDest || '',
      codePostalDest: '',
      natureMarchandise: ''
    };
    const result = await geodisRequest('api/zoomclient/recherche-envois', body);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ping', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Geodis server running on port ' + PORT));
