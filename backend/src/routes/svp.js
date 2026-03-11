const express = require('express');

const { svpRequest } = require('../lib/svpClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

function localeQuery(req) {
  const locale = req.query.locale || 'en';
  return { locale };
}

function forwardQuery(req, extras = {}) {
  return { ...req.query, ...extras };
}

router.get('/permissions', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/permissions', {
      query: localeQuery(req),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/occupations', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/occupations', {
      query: forwardQuery(req, localeQuery(req)),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/exam-constraints', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/exam_constraints', {
      query: localeQuery(req),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/available-dates', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/available_dates', {
      query: forwardQuery(req, localeQuery(req)),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/exam-sessions', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/exam_sessions', {
      query: forwardQuery(req, localeQuery(req)),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/exam-session/:id', async (req, res, next) => {
  try {
    const data = await svpRequest(
      req,
      'GET',
      `/api/v1/individual_labor_space/exam_sessions/${req.params.id}`,
      { query: localeQuery(req) }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/exam-reservations', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/exam_reservations', {
      query: forwardQuery(req, localeQuery(req)),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/exam-reservations/:id', async (req, res, next) => {
  try {
    const data = await svpRequest(
      req,
      'GET',
      `/api/v1/individual_labor_space/exam_reservations/${req.params.id}`,
      { query: localeQuery(req) }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/temporary-seats', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'POST', '/api/v1/individual_labor_space/temporary_seats', {
      query: localeQuery(req),
      body: req.body,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/exam-reservations', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'POST', '/api/v1/individual_labor_space/exam_reservations', {
      query: localeQuery(req),
      body: req.body,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/reservation-credits/use', async (req, res, next) => {
  try {
    const data = await svpRequest(
      req,
      'POST',
      '/api/v1/individual_labor_space/reservation_credits/use',
      {
        query: localeQuery(req),
        body: req.body,
      }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/certificate-price', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/certificate_price', {
      query: forwardQuery(req, localeQuery(req)),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/payments-validate-pending', async (req, res, next) => {
  try {
    const data = await svpRequest(
      req,
      'GET',
      '/api/v1/individual_labor_space/payments/validate_pending',
      {
        query: forwardQuery(req, localeQuery(req)),
      }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/payments', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'POST', '/api/v1/individual_labor_space/payments', {
      query: localeQuery(req),
      body: req.body,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/payments/:id', async (req, res, next) => {
  try {
    const data = await svpRequest(
      req,
      'GET',
      `/api/v1/individual_labor_space/payments/${req.params.id}`,
      { query: localeQuery(req) }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.put('/payments/:id', async (req, res, next) => {
  try {
    const data = await svpRequest(
      req,
      'PUT',
      `/api/v1/individual_labor_space/payments/${req.params.id}`,
      {
        query: localeQuery(req),
        body: req.body,
      }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/feature-flags', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/feature_flags', {
      query: localeQuery(req),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const data = await svpRequest(req, 'GET', '/api/v1/individual_labor_space/notifications', {
      query: forwardQuery(req, localeQuery(req)),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/user-balance/:svpUserId', async (req, res, next) => {
  try {
    const data = await svpRequest(
      req,
      'GET',
      `/api/v1/individual_labor_space/user_balance/${req.params.svpUserId}`,
      { query: localeQuery(req) }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
