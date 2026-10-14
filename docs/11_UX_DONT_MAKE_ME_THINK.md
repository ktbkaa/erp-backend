# UX ilkeleri — Don’t Make Me Think (Steve Krug)

Bu proje arayüzünde Steve Krug’un *Don’t Make Me Think* kitabındaki pratik kurallar referans alınır.  
Yeni ekran ve formlarda varsayılan standart budur.

## Özet kurallar

1. **Düşündürme.** Kullanıcı “bu ne, nereye tıklayayım?” diye duraklamamalı. Etiketler düz dilde, eylemler tanıdık olsun.
2. **Tarama için tasarla, okuma için değil.** Sayfa bir afiş gibi: net başlık, birincil eylem, ikincil gürültü yok.
3. **Gereksiz kelimeyi sil.** “Listeye dön” yerine “Liste”; stub metinler tek kısa cümle.
4. **Görsel hiyerarşi.** Nerede olduğum (ekran adı + mod), ne yapabileceğim (Kaydet / Liste) hemen görünsün.
5. **Alışkanlıklara uy.** Sol menü = modüller, alt bar = açık sekmeler, formda sol iç menü = kart bölümleri.
6. **Seçimi kolaylaştır.** Zorunlu alan `*`; lookup sarı (seçim alanı); disable alanlar gri.
7. **Gürültüyü azalt.** Filtre kutularında gereksiz kart çerçevesi yok; ALL CAPS etiket yok.
8. **Master sabit.** Master alanlar ekranda sabit kalır; kaydırma yalnızca detay / liste gövdesinde olur.
9. **Mutlu laf yok.** Boş / henüz hazır olmayan sekmelerde pazarlama metni yazma.
10. **Her yeni özellik aynı kalıba girer.** Özel “zeki” düzen yerine mevcut shell + master/detay + sekme modeli.

## Form düzeni (sabit)

```
[ Sol iç menü (boydan) ] [ Master — SABİT, scroll yok ]
                         [ Detay  — yalnızca burası kayar ]
```

- Master içeriği taşsa bile master paneli kaydırılmaz; alan sayısı master’da bilinçli tutulur.
- Fazla alan detaya veya sol menüdeki ilgili sekmeye taşınır.

## Kontrol listesi (yeni iş öncesi)

- [ ] Kullanıcı 2 saniyede “hangi ekrandayım / ne yapabilirim” sorularını cevaplayabiliyor mu?
- [ ] Birincil eylem tek ve belirgin mi?
- [ ] Master alanlar sabit mi?
- [ ] Lookup alanlar sarı + gerçek kaynaktan mı?
- [ ] Gereksiz açıklama / stub / süs metin silindi mi?
