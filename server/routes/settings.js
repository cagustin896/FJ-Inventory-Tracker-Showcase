const express = require('express');
const router = express.Router();
const { getSettingsSummary } = require('../utils/settingsSummary');
const { seedDemoData } = require('../utils/seedDemoData');

router.get('/summary', async (req, res) => {
  try {
    res.json(await getSettingsSummary());
  } catch (err) {
    console.error('[settings/summary]', err);
    res.status(500).json({ error: 'Failed to load settings summary' });
  }
});

router.post('/seed-demo', async (req, res) => {
  if (process.env.ALLOW_DEMO_SEED !== 'true' && process.env.VERCEL_SEED_DEMO !== 'true') {
    return res.status(403).json({ error: 'Demo seeding is disabled for this environment' });
  }

  try {
    const result = await seedDemoData({ date: req.body?.date });
    res.json({ success: true, ...result, summary: await getSettingsSummary() });
  } catch (err) {
    console.error('[settings/seed-demo]', err);
    res.status(500).json({ error: 'Failed to refresh demo data' });
  }
});

module.exports = router;
