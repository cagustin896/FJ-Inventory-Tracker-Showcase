if (process.env.VERCEL) {
  process.noDeprecation = true;
}

const { createApp } = require('../server/app');
const { initializeDatabase, pool } = require('../server/db');
const { seedDemoData } = require('../server/utils/seedDemoData');

const app = createApp();

let bootPromise;

async function ensureReady() {
  if (!bootPromise) {
    bootPromise = (async () => {
      await initializeDatabase();

      const shouldSeedEphemeralData = process.env.VERCEL_SEED_DEMO === 'true';

      if (shouldSeedEphemeralData) {
        const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM inventory_entries');
        if (Number(rows[0]?.total || 0) === 0) {
          await seedDemoData({ date: process.env.VERCEL_DEMO_DATE || '2026-06-08' });
        }
      }
    })();
  }

  return bootPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureReady();
    return app(req, res);
  } catch (err) {
    console.error('[vercel/bootstrap]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Application failed to initialize' }));
  }
};
