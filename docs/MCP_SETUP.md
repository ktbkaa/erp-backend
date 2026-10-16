# PostgreSQL MCP Kurulumu (Cursor + VS Code)

Bu proje için MCP yalnızca **yerel PostgreSQL**’e bağlanır.  
Amaç: AI’ın tabloları, FK’leri ve örnek (sahte) verileri doğrudan okuyabilmesi.

Şifre Git’e yazılmaz. Bağlantı profili senin bilgisayarında (OS keyring) saklanır.

---

## Ne kuruyoruz?

| Ne | Neden |
|----|--------|
| `@microsoft/postgres-mcp` | PostgreSQL şema/sorgu araçları |
| `.cursor/mcp.json` | Cursor için |
| `.vscode/mcp.json` | VS Code (Copilot Agent) için |
| `.mcp.json` | Taşınabilir / ortak format |

**“VS Code MCP” ayrı bir veritabanı değildir.**  
VS Code içinde de aynı PostgreSQL MCP sunucusunu açıyoruz.

---

## Önkoşullar (senin bilgisayarında)

1. Node.js LTS kurulu (tercihen 22+)
2. PostgreSQL çalışıyor
3. Bu repo klasörü açık (`erp-backend`)
4. İnternet var (`npx` paketi indirecek)

---

## Adım 1 — Bağlantı profili oluştur (tek sefer)

VS Code veya Cursor’un **Terminal** panelini aç. Proje klasöründe olduğundan emin ol.

Kendi bilgilerinle şunu çalıştır (örnek senin mevcut ayarına yakın):

```bash
npx -y @microsoft/postgres-mcp connection add local "postgresql://postgres@localhost:5432/postgres"
```

Sonra şifreyi güvenli kaydet:

```bash
npx -y @microsoft/postgres-mcp connection set-password local
```

Komut şifre soracak. `db.js` içinde kullandığın PostgreSQL şifresini yaz.

Kontrol:

```bash
npx -y @microsoft/postgres-mcp connection list
```

Listede `local` görünmeli.

**Başarı kriteri:** `connection list` hata vermeden profili gösterir.

---

## Adım 2 — Cursor’da aç

1. Bu projeyi Cursor ile aç.
2. Repo kökünde `.cursor/mcp.json` dosyası olmalı (bu commit ile geldi).
3. Cursor’u tamamen kapatıp yeniden aç (veya Reload Window).
4. **Settings → Tools & MCP** (veya Features → MCP) bölümüne git.
5. `postgres` sunucusunun yeşil / bağlı göründüğünü kontrol et.

Test sorusu (Chat / Agent):

> PostgreSQL’deki public tabloları listele.

**Başarı kriteri:** Tablo isimleri gelir (`firmalar`, `siparisler` vb.).

---

## Adım 3 — VS Code’da aç

1. Bu projeyi VS Code ile aç.
2. GitHub Copilot / Agent özelliklerinin açık olduğundan emin ol.
3. Repo kökünde `.vscode/mcp.json` olmalı.
4. `Ctrl+Shift+P` → **MCP: List Servers** (veya **MCP: Open Workspace Folder MCP Configuration**).
5. `postgres` sunucusunu Start / Restart et.
6. Agent / Chat’te sor:

> List the tables in my PostgreSQL database.

**Başarı kriteri:** Aynı tablolar listelenir.

İstersen PostgreSQL eklentisi de kurabilirsin (`PostgreSQL` by Microsoft). MCP için zorunlu değildir; profil `postgres-mcp` ile zaten oluşur.

---

## Adım 4 — Ne sorabilirsin?

Örnekler:

- “`siparisler` ve `siparis_detaylari` kolonlarını ve FK’leri göster”
- “Kaç firma, kaç cari, kaç sipariş var?”
- “`stoklar` için CREATE TABLE benzeri şemayı çıkar”

Bu bilgiler teknik denetimi hızlandırır.

---

## Önemli sınırlar

1. **Cloud Agent (cursor.com üzerinde çalışan ajan)** senin laptop’undaki PostgreSQL’e doğrudan ulaşamaz.  
   MCP asıl faydayı **Cursor Desktop / VS Code yerel oturumunda** verir.
2. Veriler sahte olsa bile AI yanlışlıkla `DROP TABLE` çalıştırabilir.  
   İstersen profili read-only aç: dokümanda `access_mode: ro` (microsoft/postgres-mcp).  
   Sahte lokal DB’de risk düşük; yine de önemli tabloda yedek almadan yıkıcı komut onaylama.
3. MCP, ERP iş kurallarını otomatik doğru yapmaz; sadece DB erişimini hızlandırır.

---

## Sorun çıkarsa

| Belirti | Ne yap |
|---------|--------|
| `ECONNREFUSED` | PostgreSQL servisi çalışmıyor → Services / `pgAdmin` ile kontrol |
| `password authentication failed` | `connection set-password local` tekrar |
| MCP listede yok | IDE’yi restart; doğru klasörün root’unda `mcp.json` var mı bak |
| `npx` uzun sürüyor | İlk indirme; bir kez daha dene |
| Cloud Agent DB göremiyor | Normal; yerel Cursor/VS Code’da sor |

---

## Bu adımdan sonra

MCP bağlanıp tablo listesi geldiğinde buraya yaz.  
Sonraki iş: teknik denetimi **canlı şema** ile kesinleştirmek ve onayınla A1 altyapı (`Pool` + `.env` + migration) planına geçmek.
