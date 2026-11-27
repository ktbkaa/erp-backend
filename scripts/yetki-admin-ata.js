#!/usr/bin/env node
/**
 * Bir kullanıcıyı ADMIN grubuna alır (ve isteğe bağlı parola atar).
 * Yetkilendirme geçişinde yönetim ekranlarına erişimi olan kimse kalmazsa kullanılır.
 *
 * Kullanım:
 *   node scripts/yetki-admin-ata.js <user_code>
 *   YETKI_ADMIN_PAROLA='...' node scripts/yetki-admin-ata.js <user_code>
 * Parola komut satırından alınmaz (shell geçmişine düşmesin).
 */
require('dotenv').config();
const pool = require('../db');
const { hashParola } = require('../src/utils/parola');

async function main() {
  const kod = String(process.argv[2] || '').trim();
  if (!kod) {
    console.error('Kullanım: node scripts/yetki-admin-ata.js <user_code>');
    process.exitCode = 1;
    return;
  }
  const parola = process.env.YETKI_ADMIN_PAROLA || null;
  if (parola && parola.length < 8) {
    console.error('YETKI_ADMIN_PAROLA en az 8 karakter olmalı.');
    process.exitCode = 1;
    return;
  }
  const r = await pool.query(
    `UPDATE users SET group_code='ADMIN', is_active=TRUE,
            password_hash = COALESCE($2, password_hash)
     WHERE user_code=$1 OR username=$1
     RETURNING id, user_code, (password_hash IS NOT NULL) AS parola_var`,
    [kod, parola ? hashParola(parola) : null]
  );
  if (!r.rows[0]) {
    console.error(`Kullanıcı bulunamadı: ${kod}`);
    process.exitCode = 1;
    return;
  }
  const u = r.rows[0];
  console.log(`ADMIN atandı: ${u.user_code} (id=${u.id}) · parola ${u.parola_var ? 'tanımlı' : 'TANIMSIZ — giriş yapamaz'}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
