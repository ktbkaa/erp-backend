/**
 * Pool üzerinden güvenli transaction yardımcısı.
 * BEGIN -> iş -> COMMIT; hata olursa ROLLBACK.
 */
async function withTransaction(pool, work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {
            // rollback hatası ana hatayı gizlemesin
        }
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { withTransaction };
