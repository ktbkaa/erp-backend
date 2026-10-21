/**
 * Onay kuralı / rotası için seçilebilir ekran kataloğu.
 * UI MODULES ile uyumlu belge ekranları (elle bakımlı liste).
 */
const express = require('express');
const router = express.Router();

const EKRANLAR = [
  { ekran_id: 'satin-alma-talepleri', ekran_adi: 'Satınalma Talepleri', modul: 'Satınalma' },
  { ekran_id: 'satin-alma-teklifleri', ekran_adi: 'Satınalma Teklifleri', modul: 'Satınalma' },
  { ekran_id: 'satin-alma-siparisleri', ekran_adi: 'Satınalma Siparişleri', modul: 'Satınalma' },
  { ekran_id: 'mal-kabuller', ekran_adi: 'Mal Kabuller', modul: 'Satınalma' },
  { ekran_id: 'alis-faturalari', ekran_adi: 'Alış Faturaları', modul: 'Satınalma' },
  { ekran_id: 'satis-teklifleri', ekran_adi: 'Satış Teklifleri', modul: 'Satış' },
  { ekran_id: 'satis-siparisleri', ekran_adi: 'Satış Siparişleri', modul: 'Satış' },
  { ekran_id: 'sevk-emirleri', ekran_adi: 'Sevk Emirleri', modul: 'Satış' },
  { ekran_id: 'irsaliyeler', ekran_adi: 'İrsaliyeler', modul: 'Satış' },
  { ekran_id: 'satis-faturalari', ekran_adi: 'Satış Faturaları', modul: 'Satış' },
  { ekran_id: 'uretim-emirleri', ekran_adi: 'Üretim Emirleri', modul: 'Üretim' },
  { ekran_id: 'uretim-planlari', ekran_adi: 'Üretim Planları', modul: 'Üretim' },
  { ekran_id: 'transfer-emirleri', ekran_adi: 'Transfer Emirleri', modul: 'Stok' },
  { ekran_id: 'sayim-belgeleri', ekran_adi: 'Sayım Belgeleri', modul: 'Stok' },
  { ekran_id: 'kk-emirleri-gkk', ekran_adi: 'GKK Emirleri', modul: 'Kalite' },
  { ekran_id: 'kk-emirleri-ckk', ekran_adi: 'ÇKK Emirleri', modul: 'Kalite' },
  { ekran_id: 'fatura-kontrolleri', ekran_adi: 'Fatura Kontrolleri', modul: 'Finans' },
  { ekran_id: 'muhasebe-belgeleri', ekran_adi: 'Muhasebe Belgeleri', modul: 'Finans' },
];

router.get('/', (req, res) => {
  let list = EKRANLAR.map((e, i) => ({ id: i + 1, ...e }));
  if (req.query.modul) {
    const m = String(req.query.modul).toLowerCase();
    list = list.filter((e) => e.modul.toLowerCase().includes(m));
  }
  if (req.query.q) {
    const q = String(req.query.q).toLowerCase();
    list = list.filter((e) =>
      e.ekran_id.includes(q) || e.ekran_adi.toLowerCase().includes(q),
    );
  }
  res.json(list);
});

module.exports = router;
