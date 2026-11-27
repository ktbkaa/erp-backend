/**
 * GİB zarf durum kodları (e-Fatura/e-İrsaliye sistem yanıtı) → kuyruk durumu.
 * retryable: aynı zarfı tekrar göndermek anlamlı mı (geçici GİB/entegratör sorunu).
 */
const CODES = Object.freeze({
  1000: { status: 'Gonderildi', message: 'Zarf kuyruğa eklendi' },
  1100: { status: 'Gonderildi', message: 'Zarf işleniyor' },
  1110: { status: 'Hata', message: 'Zip dosyası değil' },
  1111: { status: 'Hata', message: 'Zarf ID uzunluğu geçersiz' },
  1120: { status: 'Hata', message: 'Zarf arşivden kopyalanamadı', retryable: true },
  1130: { status: 'Hata', message: 'Zip açılamadı' },
  1131: { status: 'Hata', message: 'Zip boş' },
  1132: { status: 'Hata', message: 'XML dosyası değil' },
  1133: { status: 'Hata', message: 'Zarf ID ve XML dosyası aynı değil' },
  1140: { status: 'Hata', message: 'Doküman ayrıştırılamadı' },
  1141: { status: 'Hata', message: 'Zarf ID yok' },
  1142: { status: 'Hata', message: 'Zarf ID ve zip dosya adı aynı değil' },
  1143: { status: 'Hata', message: 'Geçersiz versiyon' },
  1150: { status: 'Hata', message: 'Schematron kontrol sonucu hatalı' },
  1160: { status: 'Hata', message: 'XML şema kontrolünden geçemedi' },
  1161: { status: 'Hata', message: 'İmza sahibi TCKN/VKN alınamadı' },
  1162: { status: 'Hata', message: 'İmza kaydedilemedi', retryable: true },
  1163: { status: 'Hata', message: 'Zarf sistemde daha önce kayıtlı bir belgeyi içeriyor' },
  1170: { status: 'Hata', message: 'Yetki kontrol edilemedi', retryable: true },
  1171: { status: 'Hata', message: 'Gönderici birim yetkisi yok' },
  1172: { status: 'Hata', message: 'Posta kutusu yetkisi yok' },
  1175: { status: 'Hata', message: 'İmza yetkisi kontrol edilemedi', retryable: true },
  1176: { status: 'Hata', message: 'İmzalayan yetkisiz' },
  1177: { status: 'Hata', message: 'Geçersiz imza' },
  1180: { status: 'Hata', message: 'Adres kontrol edilemedi', retryable: true },
  1181: { status: 'Hata', message: 'Adres bulunamadı' },
  1182: { status: 'Hata', message: 'Kullanıcı eklenemedi' },
  1183: { status: 'Hata', message: 'Kullanıcı silinemedi' },
  1190: { status: 'Hata', message: 'Sistem yanıtı hazırlanamadı', retryable: true },
  1195: { status: 'Hata', message: 'Sistem hatası', retryable: true },
  1200: { status: 'Gonderildi', message: 'Zarf başarıyla işlendi' },
  1210: { status: 'Hata', message: 'Doküman bulunan adrese gönderilemedi', retryable: true },
  1215: { status: 'Hata', message: 'Doküman gönderimi başarısız, tekrar gönderme sonlandı' },
  1220: { status: 'Gonderildi', message: 'Hedeften sistem yanıtı gelmedi' },
  1230: { status: 'Hata', message: 'Hedeften sistem yanıtı başarısız geldi' },
  1300: { status: 'Tamamlandi', message: 'Başarıyla tamamlandı' },
});

const RESPONSE_CODES = Object.freeze({
  KABUL: { status: 'Kabul', message: 'Alıcı kabul etti' },
  RED: { status: 'Red', message: 'Alıcı reddetti' },
  IADE: { status: 'Red', message: 'Alıcı iade etti' },
});

function mapGibCode(code) {
  const c = String(code ?? '').trim().toUpperCase();
  if (RESPONSE_CODES[c]) return { ...RESPONSE_CODES[c], retryable: false };
  const x = CODES[c];
  if (x) return { retryable: false, ...x };
  return null;
}

module.exports = { CODES, RESPONSE_CODES, mapGibCode };
