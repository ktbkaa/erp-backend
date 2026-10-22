/**
 * Onay kuralı / rotası için seçilebilir ekran kataloğu.
 * UI MODULES ile uyumlu belge ekranları (elle bakımlı liste).
 */
const express = require('express');
const router = express.Router();

const EKRANLAR = [
  { ekran_id: 'satin-alma-talepleri', ekran_adi: 'Satınalma Talepleri', modul: 'Satınalma', tech_id: 'PUR-REQ-SCR-001' },
  { ekran_id: 'satin-alma-teklifleri', ekran_adi: 'Satınalma Teklifleri', modul: 'Satınalma', tech_id: 'PUR-QUO-SCR-001' },
  { ekran_id: 'satin-alma-siparisleri', ekran_adi: 'Satınalma Siparişleri', modul: 'Satınalma', tech_id: 'PUR-ORD-SCR-001' },
  { ekran_id: 'mal-kabuller', ekran_adi: 'Mal Kabuller', modul: 'Satınalma', tech_id: 'PUR-GR-SCR-001' },
  { ekran_id: 'alis-faturalari', ekran_adi: 'Alış Faturaları', modul: 'Satınalma', tech_id: 'FIN-PINV-SCR-001' },
  { ekran_id: 'satis-teklifleri', ekran_adi: 'Satış Teklifleri', modul: 'Satış', tech_id: 'SAL-QUO-SCR-001' },
  { ekran_id: 'satis-siparisleri', ekran_adi: 'Satış Siparişleri', modul: 'Satış', tech_id: 'SAL-ORD-SCR-001' },
  { ekran_id: 'sevk-emirleri', ekran_adi: 'Sevk Emirleri', modul: 'Satış', tech_id: 'SAL-SHP-SCR-001' },
  { ekran_id: 'irsaliyeler', ekran_adi: 'İrsaliyeler', modul: 'Satış', tech_id: 'SAL-DLV-SCR-001' },
  { ekran_id: 'satis-faturalari', ekran_adi: 'Satış Faturaları', modul: 'Satış', tech_id: 'FIN-SINV-SCR-001' },
  { ekran_id: 'uretim-emirleri', ekran_adi: 'Üretim Emirleri', modul: 'Üretim', tech_id: 'MFG-WO-SCR-001' },
  { ekran_id: 'uretim-planlari', ekran_adi: 'Üretim Planları', modul: 'Üretim', tech_id: 'MFG-PLN-SCR-001' },
  { ekran_id: 'transfer-emirleri', ekran_adi: 'Transfer Emirleri', modul: 'Stok', tech_id: 'WMS-XFER-SCR-001' },
  { ekran_id: 'sayim-belgeleri', ekran_adi: 'Sayım Belgeleri', modul: 'Stok', tech_id: 'WMS-CNT-SCR-001' },
  { ekran_id: 'kk-emirleri-gkk', ekran_adi: 'GKK Emirleri', modul: 'Kalite', tech_id: 'QLT-IQC-SCR-001' },
  { ekran_id: 'kk-emirleri-ckk', ekran_adi: 'ÇKK Emirleri', modul: 'Kalite', tech_id: 'QLT-OQC-SCR-001' },
  { ekran_id: 'fatura-kontrolleri', ekran_adi: 'Fatura Kontrolleri', modul: 'Finans', tech_id: 'FIN-3WAY-SCR-001' },
  { ekran_id: 'muhasebe-belgeleri', ekran_adi: 'Muhasebe Belgeleri', modul: 'Finans', tech_id: 'FIN-JE-SCR-001' },
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
      e.ekran_id.includes(q) || e.ekran_adi.toLowerCase().includes(q) || (e.tech_id && e.tech_id.toLowerCase().includes(q)),
    );
  }
  res.json(list);
});

module.exports = router;
