# KTB ERP — Modül Tanıtım Rehberi

Sistemi bilmeyen kullanıcılar için ekran görüntülü tanıtım.

| Dosya | Açıklama |
|-------|----------|
| `KTB_ERP_Modul_Tanitim.html` | Tarayıcıda açın / yazdırın |
| `KTB_ERP_Modul_Tanitim.pdf` | Paylaşım için PDF |
| `shots/` | Ekran görüntüleri |

## Yenileme

```bash
# Sunucu ayaktayken
node scripts/capture-modul-tanitim-shots.js
node scripts/build-modul-tanitim-html.js
# PDF (isteğe bağlı)
node -e "const p=require('puppeteer-core'); const path=require('path'); (async()=>{const b=await p.launch({executablePath:'/usr/local/bin/google-chrome',args:['--no-sandbox'],headless:'new'}); const page=await b.newPage(); await page.goto('file://'+path.resolve('docs/modul-tanitim/KTB_ERP_Modul_Tanitim.html'),{waitUntil:'networkidle0'}); await page.pdf({path:'docs/modul-tanitim/KTB_ERP_Modul_Tanitim.pdf',format:'A4',printBackground:true,margin:{top:'12mm',bottom:'14mm',left:'10mm',right:'10mm'}}); await b.close();})()"
```
