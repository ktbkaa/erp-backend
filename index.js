require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use((req, res, next) => {
    // Önizleme / farklı origin (Cursor Ports) için CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Kullanici-Kodu');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
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
app.use('/kullanicilar', require('./routes/kisiler'));
app.use('/kullanici-gruplari', require('./routes/kullanici_gruplari'));
app.use('/sistem-parametreleri', require('./routes/sistem_parametreleri'));
app.use('/siparisler', require('./routes/siparisler'));
app.use('/satis-teklifleri', require('./routes/satis_teklifleri'));
app.use('/sevk-emirleri', require('./routes/sevk_emirleri'));
app.use('/irsaliyeler', require('./routes/irsaliyeler'));
app.use('/hareket-kodlari', require('./routes/hareket_kodlari'));
app.use('/belge-tipleri', require('./routes/belge_tipleri'));
app.use('/urun-agaclari', require('./routes/urun_agaclari'));
app.use('/bom', require('./routes/bom_araclari'));
app.use('/stok-siniflari', require('./routes/stok_siniflari'));
app.use('/is-merkezleri', require('./routes/is_merkezleri'));
app.use('/rotalar', require('./routes/rotalar'));
app.use('/satin-alma-talepleri', require('./routes/satin_alma_talepleri'));
app.use('/satin-alma-teklif-istekleri', require('./routes/satin_alma_teklif_istekleri'));
app.use('/satin-alma-teklifleri', require('./routes/satin_alma_teklifleri'));
app.use('/satin-alma-anlasmalari', require('./routes/satin_alma_anlasmalari'));
app.use('/satin-alma-siparisleri', require('./routes/satin_alma_siparisleri'));
app.use('/mal-kabuller', require('./routes/mal_kabuller'));
app.use('/uretim-emirleri', require('./routes/uretim_emirleri'));
app.use('/uretim-emri-tipleri', require('./routes/uretim_emri_tipleri'));
app.use('/stok-depo', require('./routes/stok_depo'));
app.use('/stok-partileri', require('./routes/stok_partileri'));
app.use('/kk-kontrol-planlari', require('./routes/kk_kontrol_planlari'));
app.use('/kk-stok-planlari', require('./routes/kk_stok_planlari'));
app.use('/kk-emirleri', require('./routes/kk_emirleri'));
app.use('/kk-ret-nedenleri', require('./routes/kk_ret_nedenleri'));
app.use('/mrp', require('./routes/mrp'));
app.use('/eposta-gonderimleri', require('./routes/eposta_gonderimleri'));
app.use('/crm-firsat-asamalari', require('./routes/crm_firsat_asamalari'));
app.use('/crm-faaliyet-tipleri', require('./routes/crm_faaliyet_tipleri'));
app.use('/crm-adaylar', require('./routes/crm_adaylar'));
app.use('/crm-kontaklar', require('./routes/crm_kontaklar'));
app.use('/crm-firsatlar', require('./routes/crm_firsatlar'));
app.use('/crm-faaliyetler', require('./routes/crm_faaliyetler'));
app.use('/crm-faaliyet-planlari', require('./routes/crm_faaliyet_planlari'));
app.use('/crm-gorevler', require('./routes/crm_gorevler'));
app.use('/kod-serileri', require('./routes/kod_serileri'));
app.use('/kategoriler', require('./routes/kategoriler'));
app.use('/ulkeler', require('./routes/ulkeler'));
app.use('/uretim-girisleri', require('./routes/uretim_girisleri'));
app.use('/muhasebe-hesaplari', require('./routes/muhasebe_hesaplari'));
app.use('/muhasebe-belgeleri', require('./routes/muhasebe_belgeleri'));
app.use('/mizan', require('./routes/mizan'));
app.use('/auth', require('./routes/auth'));
app.use('/kk-uygunsuzluklar', require('./routes/kk_uygunsuzluklar'));

const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

// IPv6 + IPv4 (Chrome localhost → ::1; yalnız 0.0.0.0 dinlenirse Failed to fetch)
const server = require('http').createServer(app);
server.listen({ port, host: '::', ipv6Only: false }, () => {
    console.log(`Sistem http://localhost:${port} (IPv4+IPv6) adresinde çalışıyor.`);
    console.log(`Konsol UI: http://localhost:${port}/`);
});
