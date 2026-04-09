import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import logger from '../utils/logger.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'imms-super-secret-key-2026';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'imms-refresh-token-secret-2026';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  
  if (!user) {
    logger.warn(`Failed login attempt for unknown/inactive user: ${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    logger.warn(`Failed login attempt for user: ${username} (Incorrect password)`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = { id: user.id, username: user.username, role: user.role, name: user.name };
  
  // Access Token: Short duration (15 minutes)
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  
  // Refresh Token: Long duration (7 days)
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

  // Set Refresh Token in httpOnly, Secure cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  logger.info(`User logged in: ${user.username} (ID: ${user.id})`);

  res.json({
    token: accessToken,
    user: { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email },
  });
});

router.post('/refresh', (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh token missing' });

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    const payload = { id: decoded.id, username: decoded.username, role: decoded.role, name: decoded.name };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    
    res.json({ token: accessToken });
  } catch (err) {
    logger.error(`Refresh token validation failed: ${err.message}`);
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true });
});

router.post('/change-password', (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!bcrypt.compareSync(oldPassword, user.password_hash))
    return res.status(401).json({ error: 'Old password incorrect' });
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  res.json({ success: true });
});

export default router;
