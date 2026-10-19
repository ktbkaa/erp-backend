const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function jwtSecret() {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_FALLBACK || 'ktb-erp-dev-secret-change-me';
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
