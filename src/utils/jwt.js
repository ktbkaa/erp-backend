const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function jwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_FALLBACK;
  if (secret) return secret;
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  if (env === 'production' || env === 'prod') {
    throw new Error('JWT_SECRET (veya JWT_SECRET_FALLBACK) production ortamında zorunlu.');
  }
  // Dev-only fallback — never used when NODE_ENV=production
  return 'ktb-erp-dev-secret-change-me';
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
