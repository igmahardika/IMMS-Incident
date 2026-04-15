import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'imms-super-secret-key-2026';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'imms-refresh-token-secret-2026';

export function buildAuthPayload(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  };
}

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
