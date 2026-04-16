import jwt from 'jsonwebtoken';
import { runtimeConfig } from '../../config/runtime.js';

const JWT_SECRET = runtimeConfig.JWT_SECRET;
const REFRESH_SECRET = runtimeConfig.REFRESH_TOKEN_SECRET;

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
