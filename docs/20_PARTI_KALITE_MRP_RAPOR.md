# Parti, Kalite, MRP, Stok Statü — Tamamlanma Raporu

UI build: \`20261016f\` · Migration: \`018_parti_kalite_stok_statu.sql\`

## Oluşturulan / genişletilen tablolar
- \`stok_partileri\` — lot kaydı
- \`stok_hareket_satirlari.parti_id\`, \`stok_statu\` (Kullanilabilir|Kalitede|Bloke)
- \`stoklar.parti_politika\`, \`kalite_kontrol_gerekli\`, varsayılan giriş/çıkış depo
- \`depolar.depo_rolu\` (Normal|GKK|CKK|Hammadde|Mamul|Bloke)
- \`stok_depo.varsayilan_giris/cikis\`
- \`kk_kontrol_planlari\`, \`kk_kriterleri\`, \`kk_stok_planlari\`, \`kk_emirleri\`, \`kk_olcumler\`, \`kk_uygunsuzluklar\`, \`kk_onay_gecmisi\`, \`kk_ret_nedenleri\`
- \`eposta_gonderimleri\`
- \`kullanici_gruplari\` yetki bayrakları; \`satin_alma_talepleri\` onay/oluşturan alanları

## Ekranlar
- Stok: Parti politikası / KK / emniyet / varsayılan depo; **Stok Partileri**, **MRP Hesap**; Depo Bakiye’de statü+parti
- Üretim: Malzeme-Depo Tanımlama (varsayılan giriş/çıkış)
- Kalite: GKK/ÇKK Emirleri, Kontrol Planları, Stok Plan Bağları, Ret Nedenleri
- Satınalma: Talep **Onayla + E-posta**
- Sistem: E-posta Gönderimleri; grup yetki bayrakları

## İş kuralları
1. **Parti:** Zorunlu/İsteğe bağlı/Takipsiz — girişte otomatik numara veya seçim
2. **Stok statü:** KK girişleri Kalitede; çıkış yalnızca Kullanilabilir (iş mantığı)
3. **GKK:** Mal kabulde KK’li malzeme → GKK depo + emir; onay → Hammadde (Kullanilabilir); red → Bloke
4. **ÇKK:** Üretim çıktısında KK’li → ÇKK depo + emir; onay → Mamul
5. **Mükerrer onay:** \`transfer_hareket_id\` / durum kilidi (409)
6. **Malzeme-depo:** \`STOK_DEPO_ZORUNLU=Evet\` iken tanımsız depoya giriş engeli (mal kabulde otomatik tanım)
7. **MRP:** \`emniyet_stok\` net ihtiyaca dahil (\`/mrp\`)
8. **Filtre:** varsayılan **İçerir** (\`LIKE %…%\`, TR locale)
9. **SA onay:** yalnızca \`satinalma_onay\` / SATINALMA grubu; e-posta kuyruğu

## Test sonuçları
| Senaryo | Sonuç |
|---------|-------|
| Yetkisiz SA onay (gen.user) | 403 |
| SA onay (sa.user) | Onayli |
| Mal kabul → GKK emri + Kalitede bakiye | OK |
| Yetkisiz KK onay | 403 |
| KK kaydet + onay + HAM transfer | Onayli |
| Mükerrer onay | 409 / engelli |
| MRP emniyet_stok | OK |
| Parti otomatik | OK |
| LIKE içerir | OK |

## Dış yapılandırma (gerçek ortam)
Sistem Parametreleri:
- \`SMTP_HOST\`, \`SMTP_PORT\`, \`SMTP_USER\`, \`SMTP_PASS\`, \`SMTP_FROM\`, \`SMTP_SECURE\`
- \`npm i nodemailer\` (opsiyonel; yoksa gönderim Basarisiz + hata mesajı, yeniden denenebilir)
- Depo kodları: \`GKK_DEPO_KODU\`, \`CKK_DEPO_KODU\`, \`HAMMADDE_DEPO_KODU\`, \`MAMUL_DEPO_KODU\`
- UI’da kullanıcı: \`localStorage.ktb_kullanici_kodu\` → \`X-Kullanici-Kodu\` header

## Bilinçli sınırlar / sonraki adımlar
- JWT/oturum yok; yetki header ile (A1 infra notu)
- E-posta gerçek gönderim SMTP + nodemailer ister
- Kısmi kabul / ret nedeni UI form akışı API üzerinden; emir ekranı liste+onay odaklı
- Satış/çıkış varsayılan depo otomatik doldurma tüm belgelerde kademeli genişletilebilir
