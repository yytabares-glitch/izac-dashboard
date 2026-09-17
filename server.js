const express = require('express');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

const app = express();

// CORS explicite pour tout
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GEODIS_ID  = process.env.GEODIS_ID  || '2235572$';
const GEODIS_KEY = process.env.GEODIS_KEY || '73bd9ee05e6f447f8237631f6027a9be';

function geodisRequest(service, body) {
  return new Promise((resolve, reject) => {
    const ts      = Date.now().toString();
    const payload = GEODIS_ID + ts + JSON.stringify(body);
    const sig     = crypto.createHmac('sha256', GEODIS_KEY).update(payload).digest('hex');
    const data    = JSON.stringify(body);

    console.log('→ Geodis request:', service, JSON.stringify(body));

    const options = {
      hostname: 'espace-client.geodis.com',
      path: '/services/' + service,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'accessid': GEODIS_ID,
        'timestamp': ts,
        'signature': sig,
        'lang': 'fr'
      }
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        console.log('← Geodis status:', res.statusCode);
        console.log('← Geodis body:', raw.slice(0, 500));
        try { resolve(JSON.parse(raw)); }
        catch(e) { resolve({ error: 'Parse error', raw }); }
      });
    });

    req.on('error', err => {
      console.error('← Geodis error:', err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

app.post('/api/envois', async (req, res) => {
  try {
    const { dateDebut, dateFin, noRecepisse, reference1, nomDest } = req.body;
    const body = { dateDepartDebut: dateDebut, dateDepartFin: dateFin };
    if (noRecepisse) body.noRecepisse = noRecepisse;
    if (reference1)  body.reference1  = reference1;
    if (nomDest)     body.nomDest     = nomDest;
    const result = await geodisRequest('api/zoomclient/recherche-envois', body);
    res.json(result);
  } catch(e) {
    console.error('API error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ping', (req, res) => res.json({ ok: true, id: GEODIS_ID }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Geodis server running on port ' + PORT));
