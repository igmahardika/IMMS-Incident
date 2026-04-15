import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  changeUserPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from '../services/auth/auth.js';
import { handleRoute } from '../utils/http.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, (req, res) => {
  return handleRoute(res, () => loginUser(req.body), {
    onSuccess: (result) => {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    },
    transform: (result) => ({
      token: result.accessToken,
      user: result.user,
    }),
    fallbackMessage: 'Authentication failed.',
  });
});

router.post('/refresh', (req, res) => {
  return handleRoute(res, () => refreshAccessToken(req.cookies?.refreshToken), {
    fallbackMessage: 'Authentication failed.',
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json(logoutUser());
});

router.post('/change-password', (req, res) => {
  return handleRoute(res, () => changeUserPassword(req.body), {
    fallbackMessage: 'Authentication failed.',
  });
});

export default router;
