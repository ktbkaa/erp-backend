require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use((req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    cacheControl: false,
}));

app.get('/health', async (req, res) => {
    const pool = require('./db');
    try {
        await pool.query('SELECT 1');
        res.json({
            durum: 'ok',
            zaman: new Date().toISOString(),
            veritabani: 'bagli',
        });
    } catch (err) {
        res.status(500).json({
            durum: 'hata',
            veritabani: 'baglantisiz',
            detay: err.message,
        });
    }
});

app.use('/firmalar', require('./routes/firmalar'));
app.use('/is-yerleri', require('./routes/is_yerleri'));
app.use('/depolar', require('./routes/depolar'));
app.use('/olcu-birimleri', require('./routes/olcu_birimleri'));
app.use('/stoklar', require('./routes/stoklar'));
app.use('/stok-hareketleri', require('./routes/stok_hareketleri'));
app.use('/stok-bakiyeleri', require('./routes/stok_bakiyeleri'));
app.use('/cariler', require('./routes/cariler'));
app.use('/faturalar', require('./routes/faturalar'));
app.use('/kisiler', require('./routes/kisiler'));
app.use('/siparisler', require('./routes/siparisler'));
app.use('/urun-agaclari', require('./routes/urun_agaclari'));
app.use('/is-merkezleri', require('./routes/is_merkezleri'));
app.use('/rotalar', require('./routes/rotalar'));
app.use('/satin-alma-talepleri', require('./routes/satin_alma_talepleri'));
app.use('/satin-alma-siparisleri', require('./routes/satin_alma_siparisleri'));
app.use('/mal-kabuller', require('./routes/mal_kabuller'));
app.use('/uretim-emirleri', require('./routes/uretim_emirleri'));
app.use('/kod-serileri', require('./routes/kod_serileri'));

app.listen(port, () => {
    console.log(`Sistem http://localhost:${port} adresinde çalışıyor.`);
    console.log(`Konsol UI: http://localhost:${port}/`);
});
