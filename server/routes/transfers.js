const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/:branchId/:date', async (req, res) => {
  const { branchId, date } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
        bf.name AS from_branch_name,
        bt.name AS to_branch_name
      FROM transfers t
      LEFT JOIN branches bf ON t.from_branch_id = bf.id
      LEFT JOIN branches bt ON t.to_branch_id = bt.id
      WHERE (t.from_branch_id = $1 OR t.to_branch_id = $1) AND t.date = $2
      ORDER BY t.id
    `, [branchId, date]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { branch_id, date, entries } = req.body;
  if (!branch_id || !date || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'branch_id, date, and entries array are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM transfers WHERE (from_branch_id = $1 OR to_branch_id = $1) AND date = $2',
      [branch_id, date]
    );
    for (const e of entries) {
      if (e.model && e.model.trim()) {
        await client.query(`
          INSERT INTO transfers (date, transfer_type, from_branch_id, to_branch_id, source_label, unit_type, model, storage, color, quantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          date, e.transfer_type,
          e.from_branch_id || null,
          e.to_branch_id || null,
          e.source_label || null,
          e.unit_type, e.model.trim(),
          e.storage || null, e.color || null,
          e.quantity || 1
        ]);
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transfers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
