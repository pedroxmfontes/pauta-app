const express = require('express');
const store = require('../services/store');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await store.getDismissedAlerts());
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const ids = (req.body || {}).ids;
    await store.setDismissedAlerts(Array.isArray(ids) ? ids : []);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
