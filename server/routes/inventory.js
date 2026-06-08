const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { getAutoFillEntries } = require('../utils/autoFill');
const { computeDiscrepancy } = require('../utils/discrepancy');
const { generateMorning, getNextDate } = require('../utils/generateMorning');

// GET model suggestions for autocomplete
router.get('/suggestions/models', async (req, res) => {
  const { unitType } = req.query;
  if (!unitType) return res.json([]);
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT model FROM inventory_entries
      WHERE unit_type = $1
      ORDER BY model
    `, [unitType]);
    res.json(rows.map(r => r.model));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET entries for a specific session
router.get('/:branchId/:date/:session', async (req, res) => {
  const { branchId, date, session } = req.params;
  if (session === 'autofill') {
    try {
      return res.json(await getAutoFillEntries(branchId, date));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  try {
    const { rows } = await pool.query(`
      SELECT * FROM inventory_entries
      WHERE branch_id = $1 AND date = $2 AND session = $3
      ORDER BY unit_type, model
    `, [branchId, date, session]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate-morning for a single branch/date
router.post('/generate-morning', async (req, res) => {
  const { branch_id, date } = req.body;
  if (!branch_id || !date) {
    return res.status(400).json({ error: 'branch_id and date are required' });
  }
  try {
    const result = await generateMorning(parseInt(branch_id), date);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[generate-morning]', err);
    res.status(500).json({ error: 'Failed to generate morning entries' });
  }
});

// POST generate-morning for ALL branches for a date
router.post('/generate-morning-all', async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });
  try {
    const { rows: branches } = await pool.query('SELECT id FROM branches');
    const results = await Promise.all(branches.map(b => generateMorning(b.id, date)));
    res.json({ success: true, results });
  } catch (err) {
    console.error('[generate-morning-all]', err);
    res.status(500).json({ error: 'Failed to generate morning entries' });
  }
});

// POST save inventory — always saves as 'evening', then auto-generates next morning
router.post('/', async (req, res) => {
  const { branch_id, date, entries } = req.body;
  if (!branch_id || !date || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'branch_id, date, and entries array are required' });
  }

  const session = 'evening';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM inventory_entries WHERE branch_id = $1 AND date = $2 AND session = $3`,
      [branch_id, date, session]
    );
    for (const e of entries) {
      if (e.model && e.model.trim()) {
        await client.query(`
          INSERT INTO inventory_entries (branch_id, date, session, unit_type, model, storage, color, quantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [branch_id, date, session, e.unit_type, e.model.trim(), e.storage || null, e.color || null, e.quantity || 0]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return res.status(500).json({ error: err.message });
  }
  client.release();

  // Auto-generate next day's morning from tonight's evening
  try {
    const nextDate = getNextDate(date);
    await generateMorning(parseInt(branch_id), nextDate);
  } catch (err) {
    console.error('[generate-morning after save]', err);
  }

  try {
    const discrepancy = await computeDiscrepancy(branch_id, date);
    res.json({ success: true, discrepancy });
  } catch (err) {
    res.json({ success: true, discrepancy: [] });
  }
});

router.get('/:branchId/:date/discrepancy', async (req, res) => {
  const { branchId, date } = req.params;
  try {
    res.json(await computeDiscrepancy(branchId, date));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
