import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma.js';
import { encryptString, randomToken } from '../lib/crypto.js';
import { signAccess } from '../lib/jwt.js';
import { svpRequest } from '../lib/svpClient.js';

const router = Router();
const requirePortalApproval = String(process.env.REQUIRE_PORTAL_APPROVAL || 'false') === 'true';
const debugRecaptcha = String(process.env.DEBUG_RECAPTCHA || 'false') === 'true';

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function extractOtpPayload(data) {
  const root = data?.data && typeof data.data === 'object' ? data.data : data;
  const user = root?.user || data?.user || null;

  const token = pickFirst(
    root?.access_payload?.access,
    data?.access_payload?.access,
    root?.access_payload?.token,
    data?.access_payload?.token,
    root?.accessToken,
    data?.accessToken,
    root?.access_token,
    data?.access_token,
    root?.token,
    data?.token,
  );

  const accessExpiresAt = pickFirst(
    root?.access_payload?.access_expires_at,
    data?.access_payload?.access_expires_at,
    root?.access_expires_at,
    data?.access_expires_at,
    root?.expires_at,
    data?.expires_at,
  );

  return { token, accessExpiresAt, user };
}

function logRecaptchaDebug(flow, token) {
  if (!debugRecaptcha) return;
  const len = token ? String(token).length : 0;
  console.log(`[recaptcha] flow=${flow} token_present=${Boolean(token)} token_length=${len}`);
}

const PortalLoginSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(3),
});

const LoginSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(3),
  otpMethod: z.enum(['email', 'sms']).default('email'),
  recaptchaToken: z.string().min(10).optional(),
});

const OtpSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(3),
  otpAttempt: z.string().min(4).max(10),
  otpMethod: z.enum(['email', 'sms']).default('email'),
  recaptchaToken: z.string().min(10).optional(),
});

async function assertApprovedPortalUser(login, password) {
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user || !user.passwordHash) {
    const err = new Error('No approved portal account found for this user');
    err.statusCode = 403;
    throw err;
  }

  if (!user.isApproved) {
    const err = new Error('Your account is not approved yet');
    err.statusCode = 403;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid username or password');
    err.statusCode = 401;
    throw err;
  }

  return user;
}

async function resolvePortalUserForSvpLogin(login, password) {
  if (requirePortalApproval) {
    return assertApprovedPortalUser(login, password);
  }
  return prisma.user.findUnique({ where: { login } });
}

router.post('/portal-login', async (req, res, next) => {
  try {
    const { login, password } = PortalLoginSchema.parse(req.body);
    const user = await assertApprovedPortalUser(login, password);

    const accessToken = signAccess({
      sub: user.id,
      login: user.login,
      role: user.role,
      approved: user.isApproved,
      portalOnly: true,
    });

    res.json({
      accessToken,
      nextStep: user.role === 'ADMIN' ? 'ADMIN' : 'SVP_LOGIN',
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { login, password, otpMethod, recaptchaToken } = LoginSchema.parse(req.body);
    logRecaptchaDebug('login', recaptchaToken);
    await resolvePortalUserForSvpLogin(login, password);

    const feApp = process.env.SVP_FE_APP || 'legislator';
    const captchaFields = recaptchaToken
      ? {
          recaptcha: recaptchaToken,
          recaptcha_token: recaptchaToken,
          recaptcha_v3: recaptchaToken,
          recaptcha_v3_token: recaptchaToken,
          recaptcha_response: recaptchaToken,
          'g-recaptcha-response': recaptchaToken,
        }
      : {};

    await svpRequest('/api/v1/sessions/login', {
      method: 'POST',
      body: {
        user: { login, password, otp_method: otpMethod, fe_app: feApp, ...captchaFields },
        ...captchaFields,
      },
    });

    res.json({ status: 'OTP_SENT' });
  } catch (e) {
    next(e);
  }
});

router.post('/otp-verify', async (req, res, next) => {
  try {
    const { login, password, otpAttempt, otpMethod, recaptchaToken } = OtpSchema.parse(req.body);
    logRecaptchaDebug('otp-verify', recaptchaToken);
    const portalUser = await resolvePortalUserForSvpLogin(login, password);
    const feApp = process.env.SVP_FE_APP || 'legislator';
    const captchaFields = recaptchaToken
      ? {
          recaptcha: recaptchaToken,
          recaptcha_token: recaptchaToken,
          recaptcha_v3: recaptchaToken,
          recaptcha_v3_token: recaptchaToken,
          recaptcha_response: recaptchaToken,
          'g-recaptcha-response': recaptchaToken,
        }
      : {};

    const data = await svpRequest('/api/v1/sessions/otp', {
      method: 'POST',
      body: {
        user: {
          login,
          password,
          otp_attempt: otpAttempt,
          fe_app: feApp,
          otp_method: otpMethod,
          ...captchaFields,
        },
        ...captchaFields,
      },
    });

    const otpPayload = extractOtpPayload(data);
    const svpToken = otpPayload.token;
    const svpExp = otpPayload.accessExpiresAt ? new Date(otpPayload.accessExpiresAt) : null;

    if (!svpToken) {
      const err = new Error('SVP OTP verify succeeded but no access token was returned');
      err.statusCode = 502;
      err.details = data;
      throw err;
    }

    const svpUserId = otpPayload.user?.id ?? portalUser?.svpUserId ?? null;
    const email = otpPayload.user?.email ?? portalUser?.email ?? null;
    const fullName = otpPayload.user?.full_name ?? otpPayload.user?.fullName ?? portalUser?.fullName ?? null;
    const role = portalUser?.role || 'USER';
    const isApproved = requirePortalApproval ? Boolean(portalUser?.isApproved) : true;
    const approvedAt = isApproved ? (portalUser?.approvedAt || new Date()) : null;

    const user = await prisma.user.upsert({
      where: { login },
      update: {
        svpUserId,
        email,
        fullName,
        phone: portalUser?.phone || null,
        role,
        isApproved,
        approvedAt,
        passwordHash: portalUser?.passwordHash || null,
      },
      create: {
        login,
        svpUserId,
        email,
        fullName,
        phone: portalUser?.phone || null,
        role,
        isApproved,
        approvedAt,
        passwordHash: portalUser?.passwordHash || null,
      },
    });

    const refreshRaw = randomToken(32);
    const refreshHash = await bcrypt.hash(refreshRaw, 10);
    const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14);
    const refreshExpiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        refreshExpiresAt,
        svpAccessEnc: encryptString(svpToken),
        svpAccessExp: svpExp,
      },
    });

    const accessToken = signAccess({
      sub: user.id,
      login: user.login,
      sid: session.id,
      role: user.role,
      approved: user.isApproved,
    });

    const secure = String(process.env.COOKIE_SECURE) === 'true';
    const sameSite = process.env.COOKIE_SAMESITE || 'lax';

    res.cookie('svp_rt', refreshRaw, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/api/auth/refresh',
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });
    res.cookie('svp_sid', session.id, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/api/auth/refresh',
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        login: user.login,
        svpUserId,
        email,
        fullName,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const sid = req.cookies?.svp_sid;
    const rt = req.cookies?.svp_rt;
    if (!sid || !rt) return res.status(401).json({ message: 'Missing refresh cookies' });

    const session = await prisma.session.findUnique({ where: { id: String(sid) }, include: { user: true } });
    if (!session || session.revokedAt) return res.status(401).json({ message: 'Session revoked' });
    if (session.refreshExpiresAt.getTime() < Date.now()) return res.status(401).json({ message: 'Refresh expired' });

    const ok = await bcrypt.compare(String(rt), session.refreshTokenHash);
    if (!ok) return res.status(401).json({ message: 'Invalid refresh token' });

    const accessToken = signAccess({
      sub: session.user.id,
      login: session.user.login,
      sid: session.id,
      role: session.user.role,
      approved: session.user.isApproved,
    });
    res.json({ accessToken });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const sid = req.cookies?.svp_sid;
    if (sid) {
      await prisma.session.update({ where: { id: String(sid) }, data: { revokedAt: new Date() } }).catch(() => {});
    }
    res.clearCookie('svp_rt', { path: '/api/auth/refresh' });
    res.clearCookie('svp_sid', { path: '/api/auth/refresh' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export const authRouter = router;
