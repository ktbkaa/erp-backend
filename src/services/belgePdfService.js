/**
 * Belge HTML çıktısı (yazdır / PDF önizleme). QR: uuid_ettn veya document_no metin.
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
      <td>${escapeHtml(s.item_code || s.item_id)}</td>
      <td>${escapeHtml(s.item_name || '')}</td>
      <td style="text-align:right">${escapeHtml(s.quantity)}</td>
      <td>${escapeHtml(s.uom_code || '')}</td>
      <td style="text-align:right">${escapeHtml(s.unit_price ?? '')}</td>
      <td style="text-align:right">${escapeHtml(s.total_amount ?? '')}</td>
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
      <div>Cari: ${escapeHtml(cari?.partner_name || cari?.partner_code || '')}</div>
      ${ekstra.description ? `<div>${escapeHtml(ekstra.description)}</div>` : ''}
    </div>
    <div>${qrSvgPlaceholder(ekstra.uuid_ettn || belgeNo)}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Stok</th><th>Ad</th><th>Miktar</th><th>Birim</th><th>Fiyat</th><th>Tutar</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7">Kalem yok</td></tr>'}</tbody>
  </table>
  <div class="tot">
    ${toplamlar.net_amount != null ? `<div>Mal/Hizmet: ${escapeHtml(toplamlar.net_amount)}</div>` : ''}
    ${toplamlar.tax_amount != null ? `<div>KDV: ${escapeHtml(toplamlar.tax_amount)}</div>` : ''}
    ${toplamlar.payable_amount != null ? `<div><strong>Ödenecek: ${escapeHtml(toplamlar.payable_amount)}</strong></div>` : ''}
    ${toplamlar.total_amount != null && toplamlar.payable_amount == null ? `<div><strong>Toplam: ${escapeHtml(toplamlar.total_amount)}</strong></div>` : ''}
  </div>
  <p class="no-print"><button onclick="window.print()">Yazdır / PDF</button></p>
</body></html>`;
}

module.exports = { belgeHtml, escapeHtml };
