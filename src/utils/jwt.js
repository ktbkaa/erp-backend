const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { isProduction, DEV_JWT_SECRET, WEAK_JWT_SECRETS } = require('./securityConfig');

function jwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_FALLBACK;
  if (isProduction()) {
    if (!secret) {
      throw new Error('JWT_SECRET (veya JWT_SECRET_FALLBACK) production ortamında zorunlu.');
    }
    if (WEAK_JWT_SECRETS.has(secret)) {
      throw new Error('JWT_SECRET production ortamında varsayılan/örnek değer olamaz.');
    }
    return secret;
  }
  // NODE_ENV boş + PaaS algılanırsa isProduction() true döner; bu fallback yalnız yerel/test içindir
  return secret || DEV_JWT_SECRET;
}

function signAccess(payload, ttlDk = 480) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: `${ttlDk}m` });
}

function signRefresh(payload) {
  return jwt.sign({ ...payload, typ: 'refresh' }, jwtSecret(), { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret());
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { jwtSecret, signAccess, signRefresh, verifyToken, hashToken };
