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

const GEODIS_LOGIN = '2235572$';
const GEODIS_KEY   = '35a654a41c7045d8adbea5170210cdf8';
const LANG         = 'fr';

function geodisRequest(service, body) {
  return new Promise((resolve, reject) => {
    const timestamp  = (Math.floor(Date.now() / 1000) * 1000).toString();
    const inlineBody = JSON.stringify(body);
    const message    = GEODIS_KEY + ';' + GEODIS_LOGIN + ';' + timestamp + ';' + LANG + ';' + service + ';' + inlineBody;
    const hash       = crypto.createHash('sha256').update(message, 'utf8').digest('hex');
    const serviceHeader = GEODIS_LOGIN + ';' + timestamp + ';' + LANG + ';' + hash;

    console.log('→ message:', message.slice(0, 150));

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
    const body = {};
    if (dateDebut)   body.dateDepartDebut = dateDebut;
    if (dateFin)     body.dateDepartFin   = dateFin;
    if (noRecepisse) body.noRecepisse     = noRecepisse;
    if (reference1)  body.reference1      = reference1;
    if (nomDest)     body.nomDest         = nomDest;
    const result = await geodisRequest('api/zoomclient/recherche-envois', body);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/suivi', async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.body;
    const body = {};
    if (dateDebut) body.dateDepartDebut = dateDebut;
    if (dateFin)   body.dateDepartFin   = dateFin;
    const result = await geodisRequest('api/zoomclient/suivi-envois', body);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ping', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Geodis server running on port ' + PORT));
