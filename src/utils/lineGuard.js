/**
 * Document lines are rewritten (DELETE + INSERT) on update. Once a later
 * document (receipt, delivery note, invoice …) points at those line ids the
 * DELETE fails on the foreign key. This guard lets a header-only edit pass and
 * turns a real line change into a readable 409.
 */

async function linesReferencedDownstream(client, lineTable, fkCol, docId) {
    await client.query('SAVEPOINT line_guard');
    try {
        await client.query(`DELETE FROM ${lineTable} WHERE ${fkCol}=$1`, [docId]);
        return false;
    } catch (err) {
        if (err.code === '23503') return true;
        throw err;
    } finally {
        await client.query('ROLLBACK TO SAVEPOINT line_guard');
    }
}

function sameLines(existing, submitted) {
    const norm = (rows) => (rows || [])
        .filter((s) => s && s.item_id && Number(s.quantity))
        .map((s) => `${Number(s.item_id)}|${Number(s.quantity)}`);
    const a = norm(existing);
    const b = norm(submitted);
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * @returns {Promise<boolean>} true when lines may be rewritten, false when the
 * submitted lines equal the stored ones and the rewrite should be skipped.
 * Throws a 409 error when referenced lines were changed.
 */
async function canRewriteLines(client, { lineTable, fkCol, docId, submitted, orderBy = 'id', label }) {
    if (!(await linesReferencedDownstream(client, lineTable, fkCol, docId))) return true;
    const cur = await client.query(
        `SELECT item_id, quantity FROM ${lineTable} WHERE ${fkCol}=$1 ORDER BY ${orderBy}`,
        [docId]
    );
    if (sameLines(cur.rows, submitted)) return false;
    const err = new Error(
        `${label || 'Bu belgenin'} satırları sonraki belgelerde kullanılıyor; stok veya miktar değiştirilemez. `
        + 'Başlık alanlarını satırlara dokunmadan kaydedebilirsiniz.'
    );
    err.status = 409;
    throw err;
}

module.exports = { canRewriteLines, linesReferencedDownstream };
