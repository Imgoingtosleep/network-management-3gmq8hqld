const crypto = require('crypto');

/**
 * Base64 URL encode helper
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64 URL decode helper
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Parse expiration string (e.g. '1d', '2h', '30m', '3600') to seconds
 */
function parseExpiresIn(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;
  if (!expiresIn) return 86400; // 1 day default

  const str = String(expiresIn).trim();
  const unit = str.slice(-1).toLowerCase();
  const value = parseInt(str.slice(0, -1), 10);

  if (isNaN(value)) {
    const num = parseInt(str, 10);
    return isNaN(num) ? 86400 : num;
  }

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    case 'w':
      return value * 86400 * 7;
    default:
      return 86400;
  }
}

/**
 * Sign payload to standard HMAC-SHA256 JWT
 */
function sign(payload, secret, expiresIn = '1d') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const expSeconds = parseExpiresIn(expiresIn);
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JWT token and return decoded payload
 */
function verify(token, secret) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is missing or invalid');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (err) {
    throw new Error('Invalid token payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

module.exports = {
  sign,
  verify,
};
