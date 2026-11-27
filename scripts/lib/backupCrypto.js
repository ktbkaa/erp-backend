/**
 * Yedek dosyası şifreleme (AES-256-GCM, anahtar scrypt ile paroladan türetilir).
 *
 * Dosya biçimi: "KTBENC1" (7 bayt) | salt (16) | iv (12) | şifreli veri | auth tag (16)
 * Parola: BACKUP_ENCRYPTION_PASSPHRASE (en az 16 karakter). Parola kaybı = yedek kaybı;
 * parolayı yedekten AYRI bir kasada (parola yöneticisi / secret manager) saklayın.
 */
const crypto = require('crypto');
const fs = require('fs');
const { pipeline } = require('stream/promises');

const MAGIC = Buffer.from('KTBENC1');
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

function passphraseFromEnv(env = process.env) {
  const p = env.BACKUP_ENCRYPTION_PASSPHRASE || '';
  if (!p) return null;
  if (/^DOLDURUN/i.test(p)) throw new Error('BACKUP_ENCRYPTION_PASSPHRASE hâlâ yer tutucu değerde (DOLDURUN…).');
  if (p.length < 16) throw new Error('BACKUP_ENCRYPTION_PASSPHRASE en az 16 karakter olmalı.');
  return p;
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32, SCRYPT);
}

async function encryptFile(src, dest, passphrase) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  const out = fs.createWriteStream(dest);
  out.write(Buffer.concat([MAGIC, salt, iv]));
  await pipeline(fs.createReadStream(src), cipher, out, { end: false }).catch(async (err) => {
    out.destroy();
    throw err;
  });
  await new Promise((resolve, reject) => {
    out.end(cipher.getAuthTag(), (err) => (err ? reject(err) : resolve()));
  });
  return dest;
}

function isEncrypted(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(MAGIC.length);
    fs.readSync(fd, buf, 0, MAGIC.length, 0);
    return buf.equals(MAGIC);
  } finally {
    fs.closeSync(fd);
  }
}

async function decryptFile(src, dest, passphrase) {
  const size = fs.statSync(src).size;
  if (size < HEADER_LEN + TAG_LEN) throw new Error('Şifreli dosya bozuk/eksik.');
  const fd = fs.openSync(src, 'r');
  const header = Buffer.alloc(HEADER_LEN);
  const tag = Buffer.alloc(TAG_LEN);
  try {
    fs.readSync(fd, header, 0, HEADER_LEN, 0);
    fs.readSync(fd, tag, 0, TAG_LEN, size - TAG_LEN);
  } finally {
    fs.closeSync(fd);
  }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Dosya KTBENC1 biçiminde değil.');
  const salt = header.subarray(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = header.subarray(MAGIC.length + SALT_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  try {
    await pipeline(
      fs.createReadStream(src, { start: HEADER_LEN, end: size - TAG_LEN - 1 }),
      decipher,
      fs.createWriteStream(dest)
    );
  } catch (err) {
    fs.rmSync(dest, { force: true });
    throw new Error(`Şifre çözme başarısız (yanlış parola veya bozuk dosya): ${err.message}`);
  }
  return dest;
}

module.exports = { passphraseFromEnv, encryptFile, decryptFile, isEncrypted };
