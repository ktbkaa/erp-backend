/** Tutarı Türkçe yazıya çevirir: 1234.5 TRY → "BinİkiYüzOtuzDörtTürkLirasıElliKuruş" (fatura "Yalnız" satırı). */

const BIR = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
const ON = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
const BASAMAK = ['', 'Bin', 'Milyon', 'Milyar', 'Trilyon'];

const CURRENCY = Object.freeze({
  TRY: ['TürkLirası', 'Kuruş'],
  USD: ['ABDDoları', 'Sent'],
  EUR: ['Avro', 'Sent'],
  GBP: ['İngilizSterlini', 'Peni'],
});

function ucBasamak(n) {
  const y = Math.floor(n / 100);
  const o = Math.floor((n % 100) / 10);
  const b = n % 10;
  return `${y ? `${y > 1 ? BIR[y] : ''}Yüz` : ''}${ON[o]}${BIR[b]}`;
}

function sayiYazi(n) {
  if (n === 0) return 'Sıfır';
  let out = '';
  let i = 0;
  let rest = n;
  while (rest > 0) {
    const grup = rest % 1000;
    if (grup) {
      const g = i === 1 && grup === 1 ? '' : ucBasamak(grup);
      out = `${g}${BASAMAK[i]}${out}`;
    }
    rest = Math.floor(rest / 1000);
    i += 1;
  }
  return out;
}

function tutarYazi(amount, currency = 'TRY') {
  const v = Math.abs(Number(amount || 0));
  const kurusTop = Math.round(v * 100);
  const tam = Math.floor(kurusTop / 100);
  const kurus = kurusTop % 100;
  const [ana, alt] = CURRENCY[currency] || [currency, ''];
  return `${sayiYazi(tam)}${ana}${kurus && alt ? `${sayiYazi(kurus)}${alt}` : ''}`;
}

module.exports = { tutarYazi, sayiYazi };
