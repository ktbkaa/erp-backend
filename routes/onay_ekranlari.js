/**
 * Onay kuralı / rotası için seçilebilir ekran kataloğu.
 * UI MODULES ile uyumlu belge ekranları (elle bakımlı liste).
 */
const express = require('express');
const router = express.Router();

const EKRANLAR = [
  { screen_id: 'satin-alma-talepleri', screen_name: 'Satınalma Talepleri', module: 'Satınalma', tech_id: 'PUR-REQ-SCR-001' },
  { screen_id: 'satin-alma-teklifleri', screen_name: 'Satınalma Teklifleri', module: 'Satınalma', tech_id: 'PUR-QUO-SCR-001' },
  { screen_id: 'satin-alma-siparisleri', screen_name: 'Satınalma Siparişleri', module: 'Satınalma', tech_id: 'PUR-ORD-SCR-001' },
  { screen_id: 'mal-kabuller', screen_name: 'Mal Kabuller', module: 'Satınalma', tech_id: 'PUR-GR-SCR-001' },
  { screen_id: 'giris-kontrolleri', screen_name: 'Giriş Kontrolleri', module: 'Kalite', tech_id: 'QLT-INC-SCR-001' },
  { screen_id: 'alis-faturalari', screen_name: 'Alış Faturaları', module: 'Satınalma', tech_id: 'FIN-PINV-SCR-001' },
  { screen_id: 'satis-teklifleri', screen_name: 'Satış Teklifleri', module: 'Satış', tech_id: 'SAL-QUO-SCR-001' },
  { screen_id: 'satis-siparisleri', screen_name: 'Satış Siparişleri', module: 'Satış', tech_id: 'SAL-ORD-SCR-001' },
  { screen_id: 'sevk-emirleri', screen_name: 'Sevk Emirleri', module: 'Satış', tech_id: 'SAL-SHP-SCR-001' },
  { screen_id: 'delivery_notes', screen_name: 'İrsaliyeler', module: 'Satış', tech_id: 'SAL-DLV-SCR-001' },
  { screen_id: 'satis-faturalari', screen_name: 'Satış Faturaları', module: 'Satış', tech_id: 'FIN-SINV-SCR-001' },
  { screen_id: 'uretim-emirleri', screen_name: 'Üretim Emirleri', module: 'Üretim', tech_id: 'MFG-WO-SCR-001' },
  { screen_id: 'uretim-planlari', screen_name: 'Üretim Planları', module: 'Üretim', tech_id: 'MFG-PLN-SCR-001' },
  { screen_id: 'transfer-emirleri', screen_name: 'Transfer Emirleri', module: 'Stok', tech_id: 'WMS-XFER-SCR-001' },
  { screen_id: 'sayim-belgeleri', screen_name: 'Sayım Belgeleri', module: 'Stok', tech_id: 'WMS-CNT-SCR-001' },
  { screen_id: 'kk-emirleri-gkk', screen_name: 'Giriş Kalite Emirleri', module: 'Kalite', tech_id: 'QLT-IQC-SCR-001' },
  { screen_id: 'kk-emirleri-ckk', screen_name: 'Çıkış Kalite Emirleri', module: 'Kalite', tech_id: 'QLT-OQC-SCR-001' },
  { screen_id: 'fatura-kontrolleri', screen_name: 'Fatura Kontrolleri', module: 'Finans', tech_id: 'FIN-3WAY-SCR-001' },
  { screen_id: 'muhasebe-belgeleri', screen_name: 'Muhasebe Belgeleri', module: 'Finans', tech_id: 'FIN-JE-SCR-001' },
];

router.get('/', (req, res) => {
  let list = EKRANLAR.map((e, i) => ({ id: i + 1, ...e }));
  if (req.query.module) {
    const m = String(req.query.module).toLowerCase();
    list = list.filter((e) => e.module.toLowerCase().includes(m));
  }
  if (req.query.q) {
    const q = String(req.query.q).toLowerCase();
    list = list.filter((e) =>
      e.screen_id.includes(q) || e.screen_name.toLowerCase().includes(q) || (e.tech_id && e.tech_id.toLowerCase().includes(q)),
    );
  }
  res.json(list);
});

module.exports = router;
