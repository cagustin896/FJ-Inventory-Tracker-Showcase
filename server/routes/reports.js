const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { buildDailyInventoryReport, buildSoldUnitsReport, buildStockMovementReport } = require('../utils/excelTemplates');
const { getReportsSummary } = require('../utils/reportsSummary');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return workbook.xlsx.write(res).then(() => res.end());
}

router.get('/summary/:year/:month', async (req, res) => {
  try {
    res.json(await getReportsSummary(req.params.year, req.params.month));
  } catch (err) {
    console.error('[reports/summary]', err);
    res.status(500).json({ error: 'Failed to load report summary' });
  }
});

router.get('/daily/:branchId/:date', async (req, res) => {
  const { branchId, date } = req.params;
  try {
    const { rows: branchRows } = await pool.query('SELECT * FROM branches WHERE id = $1', [branchId]);
    if (!branchRows.length) return res.status(404).json({ error: 'Branch not found' });
    const branch = branchRows[0];

    const [{ rows: morning }, { rows: evening }, { rows: sold }, { rows: transfers }] = await Promise.all([
      pool.query(`SELECT * FROM inventory_entries WHERE branch_id = $1 AND date = $2 AND session = 'morning' ORDER BY unit_type, model`, [branchId, date]),
      pool.query(`SELECT * FROM inventory_entries WHERE branch_id = $1 AND date = $2 AND session = 'evening' ORDER BY unit_type, model`, [branchId, date]),
      pool.query(`SELECT * FROM sold_units WHERE branch_id = $1 AND date = $2`, [branchId, date]),
      pool.query(`SELECT * FROM transfers WHERE (from_branch_id = $1 OR to_branch_id = $1) AND date = $2`, [branchId, date]),
    ]);

    const workbook = await buildDailyInventoryReport(branch.name, date, morning, evening, sold, transfers);
    const safeName = branch.name.replace(/[^a-z0-9]/gi, '_');
    await sendWorkbook(res, workbook, `${safeName}_Inventory_${date}.xlsx`);
  } catch (err) {
    console.error('[reports/daily]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

router.get('/sold-units/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const monthPadded = String(month).padStart(2, '0');
  const prefix = `${year}-${monthPadded}`;

  try {
    const { rows: branches } = await pool.query('SELECT * FROM branches ORDER BY id');
    const allSoldByBranch = {};

    await Promise.all(branches.map(async (branch) => {
      const { rows } = await pool.query(`
        SELECT date, SUM(quantity)::int AS quantity FROM sold_units
        WHERE branch_id = $1 AND date LIKE $2
        GROUP BY date ORDER BY date
      `, [branch.id, `${prefix}%`]);
      allSoldByBranch[branch.id] = rows;
    }));

    const workbook = await buildSoldUnitsReport(year, month, allSoldByBranch, branches);
    await sendWorkbook(res, workbook, `Sold_Units_${monthPadded}_${year}.xlsx`);
  } catch (err) {
    console.error('[reports/sold-units]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

router.get('/stock-movement/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const monthPadded = String(month).padStart(2, '0');
  const prefix = `${year}-${monthPadded}`;

  try {
    const [{ rows: branches }, { rows: transfers }] = await Promise.all([
      pool.query('SELECT * FROM branches ORDER BY id'),
      pool.query(`SELECT * FROM transfers WHERE date LIKE $1 ORDER BY date, id`, [`${prefix}%`]),
    ]);

    const workbook = await buildStockMovementReport(year, month, transfers, branches);
    await sendWorkbook(res, workbook, `Stock_Movement_${monthPadded}_${year}.xlsx`);
  } catch (err) {
    console.error('[reports/stock-movement]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
