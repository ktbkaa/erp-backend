const crypto = require('crypto');

function hashParola(parola, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(parola), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function dogrulaParola(parola, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(String(parola), salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch {
    return false;
  }
}

module.exports = { hashParola, dogrulaParola };
