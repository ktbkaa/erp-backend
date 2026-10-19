/**
 * Belge HTML çıktısı (yazdır / PDF önizleme). QR: ettn veya belge_no metin.
 */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function qrSvgPlaceholder(text) {
  const t = escapeHtml(text || '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="QR">
    <rect width="96" height="96" fill="#fff" stroke="#111"/>
    <text x="48" y="52" text-anchor="middle" font-size="8" font-family="monospace">${t.slice(0, 18)}</text>
  </svg>`;
}

function belgeHtml({ baslik, belgeNo, tarih, cari, satirlar = [], toplamlar = {}, ekstra = {} }) {
  const rows = satirlar
    .map(
      (s, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(s.stok_kodu || s.stok_id)}</td>
      <td>${escapeHtml(s.stok_adi || '')}</td>
      <td style="text-align:right">${escapeHtml(s.miktar)}</td>
      <td>${escapeHtml(s.birim || '')}</td>
      <td style="text-align:right">${escapeHtml(s.birim_fiyat ?? '')}</td>
      <td style="text-align:right">${escapeHtml(s.toplam_tutar ?? '')}</td>
    </tr>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/><title>${escapeHtml(baslik)} ${escapeHtml(belgeNo)}</title>
<style>
  body{font-family:Georgia,serif;margin:24px;color:#1a1a1a}
  h1{font-size:1.4rem;margin:0 0 .25rem}
  .meta{display:flex;justify-content:space-between;gap:1rem;margin:1rem 0}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th,td{border:1px solid #ccc;padding:6px 8px;font-size:.9rem}
  th{background:#f3f3f3;text-align:left}
  .tot{margin-top:1rem;text-align:right}
  @media print{.no-print{display:none}}
</style></head><body>
  <div class="meta">
    <div>
      <h1>${escapeHtml(baslik)}</h1>
      <div>Belge No: <strong>${escapeHtml(belgeNo)}</strong></div>
      <div>Tarih: ${escapeHtml(tarih || '')}</div>
      <div>Cari: ${escapeHtml(cari?.cari_adi || cari?.cari_kodu || '')}</div>
      ${ekstra.aciklama ? `<div>${escapeHtml(ekstra.aciklama)}</div>` : ''}
    </div>
    <div>${qrSvgPlaceholder(ekstra.ettn || belgeNo)}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Stok</th><th>Ad</th><th>Miktar</th><th>Birim</th><th>Fiyat</th><th>Tutar</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7">Kalem yok</td></tr>'}</tbody>
  </table>
  <div class="tot">
    ${toplamlar.mal_hizmet_toplam != null ? `<div>Mal/Hizmet: ${escapeHtml(toplamlar.mal_hizmet_toplam)}</div>` : ''}
    ${toplamlar.toplam_kdv != null ? `<div>KDV: ${escapeHtml(toplamlar.toplam_kdv)}</div>` : ''}
    ${toplamlar.odenecek_tutar != null ? `<div><strong>Ödenecek: ${escapeHtml(toplamlar.odenecek_tutar)}</strong></div>` : ''}
    ${toplamlar.toplam_tutar != null && toplamlar.odenecek_tutar == null ? `<div><strong>Toplam: ${escapeHtml(toplamlar.toplam_tutar)}</strong></div>` : ''}
  </div>
  <p class="no-print"><button onclick="window.print()">Yazdır / PDF</button></p>
</body></html>`;
}

module.exports = { belgeHtml, escapeHtml };
