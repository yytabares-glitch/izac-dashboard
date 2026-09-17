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

const GEODIS_ID  = process.env.GEODIS_ID  || '2235572$';
const GEODIS_KEY = process.env.GEODIS_KEY || 'cbba43b9ed1c477ca23b4bcabb384b17';

function geodisRequest(service, body) {
  return new Promise((resolve, reject) => {
    const ts   = Date.now().toString();
    const data = JSON.stringify(body);

    // Signature exacte doc Geodis : SHA256(cle + timestamp + body)
    const sig = crypto.createHash('sha256')
      .update(GEODIS_KEY + ts + data, 'utf8')
      .digest('hex');

    console.log('→ payload sig:', (GEODIS_KEY + ts + data).slice(0, 80));
    console.log('→ sig:', sig);

    const options = {
      hostname: 'espace-client.geodis.com',
      path: '/services/' + service,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Length': Buffer.byteLength(data, 'utf8'),
        'accessid': GEODIS_ID,
        'timestamp': ts,
        'signature': sig,
        'lang': 'fr',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        console.log('← status:', res.statusCode);
        console.log('← headers:', JSON.stringify(res.headers));
        console.log('← body:', raw.slice(0, 1000));
        try { resolve(JSON.parse(raw)); }
        catch(e) { resolve({ error: 'Parse error', raw }); }
      });
    });

    req.on('error', err => {
      console.error('← error:', err.message);
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

app.get('/api/ping', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Geodis server running on port ' + PORT));
