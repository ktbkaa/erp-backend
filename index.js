const express = require('express');
const app = express();
const port = 3000;

app.use(express.json()); // Dışarıdan gelen verileri okumak için

const firmalarRotalari = require('./routes/firmalar');
app.use('/firmalar', firmalarRotalari);

const isYeriRotalari = require('./routes/is_yerleri');
app.use('/is-yerleri', isYeriRotalari);

const stoklarRotalari = require('./routes/stoklar'); // <--- YUKARI TAŞINDI
app.use('/stoklar', stoklarRotalari);                 // <--- YUKARI TAŞINDI

const cariRotalari = require('./routes/cariler');
app.use('/cariler', cariRotalari);

const faturaRotalari = require('./routes/faturalar');
app.use('/faturalar', faturaRotalari);

const kisiRotalari = require('./routes/kisiler');
app.use('/kisiler', kisiRotalari);

const siparisRotalari = require('./routes/siparisler');
app.use('/siparisler', siparisRotalari);

app.listen(port, () => {
    console.log(`Sistem http://localhost:${port} adresinde esiyor!`);
});