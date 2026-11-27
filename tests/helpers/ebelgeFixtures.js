/** e-Belge testleri için örnek (sentetik) modeller. Gerçek mükellef bilgisi değildir. */
const supplier = {
  idScheme: 'VKN',
  id: '1234567801',
  name: 'KTB Metal Sanayi ve Ticaret A.Ş.',
  taxOffice: 'Büyük Mükellefler',
  website: 'https://ktb.example.com.tr',
  phone: '+90 212 555 00 00',
  email: 'efatura@ktb.example.com.tr',
  extraIds: [{ scheme: 'MERSISNO', id: '0123456789000015' }],
  address: {
    street: 'Organize Sanayi Bölgesi 3. Cadde',
    buildingNo: '12',
    district: 'Başakşehir',
    city: 'İstanbul',
    postalZone: '34490',
    country: 'Türkiye',
    countryCode: 'TR',
  },
};

const customerCompany = {
  idScheme: 'VKN',
  id: '9876543210',
  name: 'Örnek Çelik Ürünleri Ltd. Şti.',
  taxOffice: 'Çankaya',
  email: 'muhasebe@ornekcelik.example.com.tr',
  address: {
    street: 'Atatürk Bulvarı No:5',
    district: 'Çankaya',
    city: 'Ankara',
    postalZone: '06420',
    country: 'Türkiye',
    countryCode: 'TR',
  },
};

const customerPerson = {
  idScheme: 'TCKN',
  id: '11111111111',
  name: 'Ayşe Gündoğdu',
  firstName: 'Ayşe',
  familyName: 'Gündoğdu',
  address: { street: 'Şişli Cad. 7', district: 'Şişli', city: 'İstanbul', postalZone: '34360', country: 'Türkiye', countryCode: 'TR' },
};

function baseInvoice(over = {}) {
  return {
    profileId: 'TICARIFATURA',
    invoiceTypeCode: 'SATIS',
    id: 'EFT2026000000001',
    uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f',
    issueDate: '2026-11-27',
    issueTime: '10:15:00',
    currency: 'TRY',
    notes: ['Ödeme 30 gün vadelidir.'],
    supplier,
    customer: customerCompany,
    orderReference: { id: 'B00012', issueDate: '2026-11-20' },
    despatchReferences: [{ id: 'IRS2026000000007', issueDate: '2026-11-26' }],
    paymentMeans: { code: '42', dueDate: '2026-12-27', iban: 'TR330006100519786457841326', bankName: 'Örnek Bankası' },
    lines: [
      { id: 1, name: 'Sac Levha 2mm Ğüşİöç', sellersItemId: 'SAC-002', quantity: 10, unitCode: 'KGM', unitPrice: 125.5, allowance: 25.5, vatPercent: 20 },
      { id: 2, name: 'Kaynak Hizmeti', sellersItemId: 'HZM-KYN', quantity: 2, unitCode: 'HUR', unitPrice: 750, vatPercent: 20 },
      { id: 3, name: 'Gıda Numune', sellersItemId: 'GDA-01', quantity: 3, unitCode: 'C62', unitPrice: 33.333, vatPercent: 1 },
    ],
    ...over,
  };
}

function baseDespatch(over = {}) {
  return {
    profileId: 'TEMELIRSALIYE',
    despatchTypeCode: 'SEVK',
    id: 'IRS2026000000007',
    uuid: '7a1c2e3f-1111-4222-8333-944455556666',
    issueDate: '2026-11-26',
    issueTime: '08:30:00',
    supplier,
    customer: customerCompany,
    orderReference: { id: 'B00012', issueDate: '2026-11-20' },
    shipment: {
      vehiclePlate: '34ABC123',
      trailerPlate: '34DR456',
      drivers: [{ firstName: 'Mehmet', familyName: 'Öztürk', nationalId: '12345678950' }],
      deliveryAddress: customerCompany.address,
      despatchDate: '2026-11-26',
      despatchTime: '09:00:00',
    },
    lines: [
      { id: 1, name: 'Sac Levha 2mm', sellersItemId: 'SAC-002', quantity: 10, unitCode: 'KGM' },
      { id: 2, name: 'Profil 40x40', sellersItemId: 'PRF-4040', quantity: 6, unitCode: 'MTR' },
    ],
    ...over,
  };
}

module.exports = { supplier, customerCompany, customerPerson, baseInvoice, baseDespatch };
