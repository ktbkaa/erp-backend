require('dotenv').config();
const express = require('express');
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());

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
app.use('/cariler', require('./routes/cariler'));
app.use('/faturalar', require('./routes/faturalar'));
app.use('/kisiler', require('./routes/kisiler'));
app.use('/siparisler', require('./routes/siparisler'));

app.listen(port, () => {
    console.log(`Sistem http://localhost:${port} adresinde çalışıyor.`);
});
