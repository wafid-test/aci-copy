import { Router } from 'express';
import { AccountStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { clearApprovedCookie, clearAuthCookie, setApprovedCookie, setAuthCookie } from '../lib/cookies.js';
import { publicAccount } from '../lib/account.js';
import { authRequired } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const account = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });
  if (!account) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const matches = await verifyPassword(password, account.password);
  if (!matches) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  if (account.status !== AccountStatus.ACTIVE) {
    res.status(403).json({ message: `Account is ${account.status.toLowerCase()}` });
    return;
  }

  const token = signToken({ sub: account.id, role: account.role });
  setAuthCookie(res, token);
  setApprovedCookie(res, account.status === AccountStatus.ACTIVE);

  res.json({
    message: 'Login successful',
    accessToken: token,
    user: publicAccount(account)
  });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  clearApprovedCookie(res);
  res.json({ message: 'Logout successful' });
});

authRouter.get('/me', authRequired, async (req, res) => {
  const account = await prisma.account.findUnique({ where: { id: req.auth!.sub } });
  if (!account) {
    res.status(404).json({ message: 'Account not found' });
    return;
  }

  res.json({ user: publicAccount(account) });
});

authRouter.post('/refresh', authRequired, async (req, res) => {
  const account = await prisma.account.findUnique({ where: { id: req.auth!.sub } });
  if (!account || account.status !== AccountStatus.ACTIVE) {
    clearAuthCookie(res);
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = signToken({ sub: account.id, role: account.role });
  setAuthCookie(res, token);
  setApprovedCookie(res, true);
  res.json({ accessToken: token, user: publicAccount(account) });
});
