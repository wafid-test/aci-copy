import { Router } from 'express';

import { requireAuth } from '../lib/authMiddleware.js';
import { decryptString } from '../lib/crypto.js';
import { prisma } from '../lib/prisma.js';
import { svpRequest } from '../lib/svpClient.js';

const router = Router();

router.use(requireAuth);

async function getSvpToken(req) {
  const sessionId = req.user?.sid;
  if (!sessionId) {
    const err = new Error('Missing session id on access token');
    err.statusCode = 401;
    throw err;
  }

  const session = await prisma.session.findUnique({ where: { id: String(sessionId) } });
  if (!session || session.revokedAt) {
    const err = new Error('Session not found or revoked');
    err.statusCode = 401;
    throw err;
  }

  if (!session.svpAccessEnc) {
    const err = new Error('Missing SVP access token on session');
    err.statusCode = 401;
    throw err;
  }

  return decryptString(session.svpAccessEnc);
}

function buildPath(basePath, query = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'locale') return;
    params.set(key, String(value));
  });

  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

async function forward(req, method, basePath, body) {
  const token = await getSvpToken(req);
  return svpRequest(buildPath(basePath, req.query), { method, token, body });
}

router.get('/permissions', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/permissions'));
  } catch (error) {
    next(error);
  }
});

router.get('/occupations', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/occupations'));
  } catch (error) {
    next(error);
  }
});

router.get('/exam-constraints', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/exam_constraints'));
  } catch (error) {
    next(error);
  }
});

router.get('/available-dates', async (req, res, next) => {
  try {
    return res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/available_dates'));
  } catch (error) {
    // Some SVP versions use dashed path. Retry once for compatibility.
    if (error?.statusCode === 404) {
      try {
        return res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/available-dates'));
      } catch (error2) {
        return next(error2);
      }
    }
    next(error);
  }
});

router.get('/exam-sessions', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/exam_sessions'));
  } catch (error) {
    next(error);
  }
});

router.get('/exam-session/:id', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', `/api/v1/individual_labor_space/exam_sessions/${req.params.id}`));
  } catch (error) {
    next(error);
  }
});

router.get('/exam-reservations', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/exam_reservations'));
  } catch (error) {
    next(error);
  }
});

router.get('/exam-reservations/:id', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', `/api/v1/individual_labor_space/exam_reservations/${req.params.id}`));
  } catch (error) {
    next(error);
  }
});

router.post('/temporary-seats', async (req, res, next) => {
  try {
    res.json(await forward(req, 'POST', '/api/v1/individual_labor_space/temporary_seats', req.body));
  } catch (error) {
    next(error);
  }
});

router.post('/exam-reservations', async (req, res, next) => {
  try {
    res.json(await forward(req, 'POST', '/api/v1/individual_labor_space/exam_reservations', req.body));
  } catch (error) {
    next(error);
  }
});

router.post('/reservation-credits/use', async (req, res, next) => {
  try {
    res.json(await forward(req, 'POST', '/api/v1/individual_labor_space/reservation_credits/use', req.body));
  } catch (error) {
    next(error);
  }
});

router.get('/certificate-price', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/certificate_price'));
  } catch (error) {
    next(error);
  }
});

router.get('/payments-validate-pending', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/payments/validate_pending'));
  } catch (error) {
    next(error);
  }
});

router.post('/payments', async (req, res, next) => {
  try {
    res.json(await forward(req, 'POST', '/api/v1/individual_labor_space/payments', req.body));
  } catch (error) {
    next(error);
  }
});

router.get('/payments/:id', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', `/api/v1/individual_labor_space/payments/${req.params.id}`));
  } catch (error) {
    next(error);
  }
});

router.put('/payments/:id', async (req, res, next) => {
  try {
    res.json(await forward(req, 'PUT', `/api/v1/individual_labor_space/payments/${req.params.id}`, req.body));
  } catch (error) {
    next(error);
  }
});

router.get('/feature-flags', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/feature_flags'));
  } catch (error) {
    next(error);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', '/api/v1/individual_labor_space/notifications'));
  } catch (error) {
    next(error);
  }
});

router.get('/user-balance/:svpUserId', async (req, res, next) => {
  try {
    res.json(await forward(req, 'GET', `/api/v1/individual_labor_space/user_balance/${req.params.svpUserId}`));
  } catch (error) {
    next(error);
  }
});

export const svpRouter = router;
