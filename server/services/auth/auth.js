import bcrypt from 'bcryptjs';
import db from '../../db.js';
import logger from '../../utils/logger.js';
import {
  buildAuthPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens.js';

export function loginUser({ username, password }) {
  if (!username || !password) {
    const error = new Error('Username and password required');
    error.status = 400;
    throw error;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

  if (!user) {
    logger.warn(`Failed login attempt for unknown/inactive user: ${username}`);
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    logger.warn(`Failed login attempt for user: ${username} (Incorrect password)`);
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const payload = buildAuthPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  logger.info(`User logged in: ${user.username} (ID: ${user.id})`);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
}

export function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    const error = new Error('Refresh token missing');
    error.status = 401;
    throw error;
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(buildAuthPayload(decoded));
    return { token: accessToken };
  } catch (err) {
    logger.error(`Refresh token validation failed: ${err.message}`);
    const error = new Error('Invalid or expired refresh token');
    error.status = 403;
    throw error;
  }
}

export function logoutUser() {
  return { success: true };
}

export function changeUserPassword({ userId, oldPassword, newPassword }) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    const error = new Error('Old password incorrect');
    error.status = 401;
    throw error;
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  return { success: true };
}
