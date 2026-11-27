# GİB UBL-TR şema ve kural dosyaları

`src/services/ebelge/validator.js` üretilen e-belgeleri bu dosyalarla doğrular (`xmllint-wasm`, ağ erişimi gerektirmez).

| Klasör | İçerik | Kaynak |
|--------|--------|--------|
| `xsdrt/maindoc`, `xsdrt/common` | UBL 2.1 + UBL-TR XSD (Invoice, DespatchAdvice, ReceiptAdvice, ApplicationResponse …) | GİB `UBL-TR1.2.1_Paketi.zip` |
| `xsdrt/envelope` | GİB zarfı: `PackageProxy_1_2.xsd`, `StandardBusinessDocumentHeader.xsd` ve bağımlılıkları | GİB `e-FaturaPaketi.zip` |
| `xsdrt/HRXML` | Zarf şemasının bağımlılığı | GİB `e-FaturaPaketi.zip` |
| `schematron/UBL-TR_Codelist.xml` | Kod listeleri (fatura tipi, vergi, tevkifat, istisna, birim, para birimi …); `codeLists.js` bunu ayrıştırır | GİB `UBL-TR1.2.1_Paketi.zip` |
| `schematron/UBL-TR_Main_Schematron.xml`, `UBL-TR_Common_Schematron.xml` | GİB şematron kuralları (başvuru; `validator.js` bunların XPath 1.0 portunu uygular) | GİB `UBL-TR1.2.1_Paketi.zip` |

İndirme adresleri:

- https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/UBL-TR1.2.1_Paketi.zip (SHA-256 `cb583941b8a8a239c59902c6bc455c0f75d48f2bb81d7d3fbe1ae827f981f7db`)
- https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-FaturaPaketi.zip (SHA-256 `e0fd9136cadbb79bd29f286c7ff80c6f2202ce1a0354338d0bf0739dd88dc29e`)

GİB yeni paket yayımladığında bu klasörü güncelleyin ve `npm test` (özellikle `tests/ebelge_ubl.test.js`) çalıştırın. `tests/fixtures/ebelge/` altındaki örnekler aynı paketlerin örnek belgeleridir.
