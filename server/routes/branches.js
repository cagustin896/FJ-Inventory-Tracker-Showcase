const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const CORE_BRANCHES = ['IT Park', 'Mandaue', 'Star Mall', 'Lapu-Lapu'];
const branchOrderSql = `
  CASE name
    WHEN 'IT Park' THEN 1
    WHEN 'Mandaue' THEN 2
    WHEN 'Star Mall' THEN 3
    WHEN 'Lapu-Lapu' THEN 4
    ELSE 5
  END, name
`;

router.get('/', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { rows } = await pool.query(`SELECT * FROM branches ORDER BY ${branchOrderSql}`);
    res.set('X-Query-Time-Ms', String(Date.now() - startedAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO branches (name) VALUES ($1) RETURNING id, name',
      [name.trim()]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Branch name already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rowCount, rows } = await pool.query(
      'UPDATE branches SET name = $1 WHERE id = $2 RETURNING id, name',
      [name.trim(), req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Branch not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Branch name already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid branch id' });

  try {
    const { rowCount, rows: branchRows } = await pool.query('SELECT id, name FROM branches WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Branch not found' });
    if (CORE_BRANCHES.includes(branchRows[0].name)) {
      return res.status(409).json({ error: 'Core branches cannot be deleted.' });
    }

    const { rows } = await pool.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM inventory_entries WHERE branch_id = $1) AS inventory_count,
          (SELECT COUNT(*)::int FROM accessories_entries WHERE branch_id = $1) AS accessories_count,
          (SELECT COUNT(*)::int FROM sold_units WHERE branch_id = $1) AS sold_count,
          (SELECT COUNT(*)::int FROM inventory_adjustments WHERE branch_id = $1) AS adjustments_count,
          (SELECT COUNT(*)::int FROM transfers WHERE from_branch_id = $1 OR to_branch_id = $1) AS transfers_count
      `,
      [id]
    );
    const usage = rows[0];
    const totalReferences = Object.values(usage).reduce((sum, count) => sum + Number(count || 0), 0);

    if (totalReferences > 0) {
      return res.status(409).json({
        error: 'Cannot delete branch because it has existing inventory, sales, transfers, accessories, or adjustment records.',
        usage,
      });
    }

    await pool.query('DELETE FROM branches WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
