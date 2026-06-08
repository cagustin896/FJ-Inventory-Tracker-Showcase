const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { getDashboardTrends } = require('../utils/dashboardTrends');

// Must be registered before /:date to avoid "breakdown" matching as a date param
router.get('/breakdown/:branchId/:date/:session/:category', async (req, res) => {
  const { branchId, date, session, category } = req.params;
  try {
    let rows = [];

    if (category === 'brand_new') {
      ({ rows } = await pool.query(`
        SELECT model, storage, color, quantity FROM inventory_entries
        WHERE branch_id = $1 AND date = $2 AND session = $3 AND unit_type = 'Brand New (iPhone)'
        ORDER BY model
      `, [branchId, date, session]));

    } else if (category === 'secondhand') {
      ({ rows } = await pool.query(`
        SELECT model, storage, color, quantity FROM inventory_entries
        WHERE branch_id = $1 AND date = $2 AND session = $3 AND unit_type = 'Secondhand (iPhone)'
        ORDER BY model
      `, [branchId, date, session]));

    } else if (category === 'android') {
      ({ rows } = await pool.query(`
        SELECT model, storage, color, quantity FROM inventory_entries
        WHERE branch_id = $1 AND date = $2 AND session = $3 AND unit_type = 'Android'
        ORDER BY model
      `, [branchId, date, session]));

    } else if (category === 'ipad_macbook') {
      ({ rows } = await pool.query(`
        SELECT model, storage, color, quantity FROM inventory_entries
        WHERE branch_id = $1 AND date = $2 AND session = $3 AND unit_type = 'iPad & MacBook'
        ORDER BY model
      `, [branchId, date, session]));

    } else if (category === 'accessories') {
      ({ rows } = await pool.query(`
        SELECT accessory, quantity FROM accessories_entries
        WHERE branch_id = $1 AND date = $2 AND session = $3
        ORDER BY accessory
      `, [branchId, date, session]));

    } else if (category === 'sold') {
      ({ rows } = await pool.query(`
        SELECT unit_type, model, storage, color, quantity FROM sold_units
        WHERE branch_id = $1 AND date = $2
        ORDER BY unit_type, model
      `, [branchId, date]));

    } else if (category === 'stockins') {
      ({ rows } = await pool.query(`
        SELECT t.unit_type, t.model, t.storage, t.color, b.name AS from_branch, t.quantity
        FROM transfers t
        LEFT JOIN branches b ON t.from_branch_id = b.id
        WHERE t.to_branch_id = $1 AND t.date = $2 AND t.transfer_type = 'stock_in'
        ORDER BY t.model
      `, [branchId, date]));

    } else if (category === 'pullouts') {
      ({ rows } = await pool.query(`
        SELECT t.unit_type, t.model, t.storage, t.color, b.name AS to_branch, t.quantity
        FROM transfers t
        LEFT JOIN branches b ON t.to_branch_id = b.id
        WHERE t.from_branch_id = $1 AND t.date = $2 AND t.transfer_type = 'pull_out'
        ORDER BY t.model
      `, [branchId, date]));
    }

    res.json(rows);
  } catch (err) {
    console.error('[dashboard/breakdown]', err);
    res.status(500).json({ message: 'Failed to load breakdown data' });
  }
});

router.get('/:date', async (req, res) => {
  const { date } = req.params;
  const startedAt = Date.now();
  try {
    const [
      { rows: branches },
      { rows: inventoryRows },
      { rows: accessoryRows },
      { rows: soldRows },
      { rows: pullOutRows },
      { rows: stockInRows },
    ] = await Promise.all([
      pool.query(`
        SELECT id, name FROM branches
        ORDER BY
          CASE name
            WHEN 'IT Park' THEN 1
            WHEN 'Mandaue' THEN 2
            WHEN 'Star Mall' THEN 3
            WHEN 'Lapu-Lapu' THEN 4
            ELSE 5
          END,
          name
      `),
      pool.query(`
        SELECT
          branch_id,
          session,
          COUNT(*)::int AS row_count,
          COALESCE(SUM(CASE WHEN unit_type = 'Brand New (iPhone)' THEN quantity ELSE 0 END), 0)::int AS brand_new,
          COALESCE(SUM(CASE WHEN unit_type = 'Secondhand (iPhone)' THEN quantity ELSE 0 END), 0)::int AS secondhand,
          COALESCE(SUM(CASE WHEN unit_type = 'Android' THEN quantity ELSE 0 END), 0)::int AS android,
          COALESCE(SUM(CASE WHEN unit_type = 'iPad & MacBook' THEN quantity ELSE 0 END), 0)::int AS ipad_macbook
        FROM inventory_entries
        WHERE date = $1 AND session IN ('morning', 'evening')
        GROUP BY branch_id, session
      `, [date]),
      pool.query(`
        SELECT branch_id, session, COALESCE(SUM(quantity), 0)::int AS accessories
        FROM accessories_entries
        WHERE date = $1 AND session IN ('morning', 'evening')
        GROUP BY branch_id, session
      `, [date]),
      pool.query(`
        SELECT branch_id, COALESCE(SUM(quantity), 0)::int AS sold
        FROM sold_units
        WHERE date = $1
        GROUP BY branch_id
      `, [date]),
      pool.query(`
        SELECT from_branch_id AS branch_id, COALESCE(SUM(quantity), 0)::int AS pull_outs
        FROM transfers
        WHERE date = $1 AND transfer_type = 'pull_out' AND from_branch_id IS NOT NULL
        GROUP BY from_branch_id
      `, [date]),
      pool.query(`
        SELECT to_branch_id AS branch_id, COALESCE(SUM(quantity), 0)::int AS stock_ins
        FROM transfers
        WHERE date = $1 AND transfer_type = 'stock_in' AND to_branch_id IS NOT NULL
        GROUP BY to_branch_id
      `, [date]),
    ]);

    const keyed = (rows, keyFn) => {
      const map = new Map();
      rows.forEach(row => map.set(keyFn(row), row));
      return map;
    };

    const inventoryByBranchSession = keyed(inventoryRows, row => `${row.branch_id}:${row.session}`);
    const accessoriesByBranchSession = keyed(accessoryRows, row => `${row.branch_id}:${row.session}`);
    const soldByBranch = keyed(soldRows, row => row.branch_id);
    const pullOutByBranch = keyed(pullOutRows, row => row.branch_id);
    const stockInByBranch = keyed(stockInRows, row => row.branch_id);

    const buildBranch = (branch, session) => {
      const inv = inventoryByBranchSession.get(`${branch.id}:${session}`) || {};
      const acc = accessoriesByBranchSession.get(`${branch.id}:${session}`) || {};
      const data = {
        branch_id: branch.id,
        branch_name: branch.name,
        has_data: Number(inv.row_count || 0) > 0,
        brand_new: Number(inv.brand_new || 0),
        secondhand: Number(inv.secondhand || 0),
        android: Number(inv.android || 0),
        ipad_macbook: Number(inv.ipad_macbook || 0),
        accessories: Number(acc.accessories || 0),
      };

      if (session === 'evening') {
        data.sold = Number(soldByBranch.get(branch.id)?.sold || 0);
        data.pull_outs = Number(pullOutByBranch.get(branch.id)?.pull_outs || 0);
        data.stock_ins = Number(stockInByBranch.get(branch.id)?.stock_ins || 0);
      }

      return data;
    };

    const morningBranches = branches.map(branch => buildBranch(branch, 'morning'));
    const eveningBranches = branches.map(branch => buildBranch(branch, 'evening'));

    const sum = (arr, field) => arr.reduce((s, b) => s + (b[field] || 0), 0);

    res.set('X-Query-Time-Ms', String(Date.now() - startedAt));
    const trends = await getDashboardTrends(date, 14);

    res.json({
      date,
      trends,
      morning: {
        branches: morningBranches,
        totals: {
          brand_new:    sum(morningBranches, 'brand_new'),
          secondhand:   sum(morningBranches, 'secondhand'),
          android:      sum(morningBranches, 'android'),
          ipad_macbook: sum(morningBranches, 'ipad_macbook'),
          accessories:  sum(morningBranches, 'accessories'),
        },
      },
      evening: {
        branches: eveningBranches,
        totals: {
          brand_new:    sum(eveningBranches, 'brand_new'),
          secondhand:   sum(eveningBranches, 'secondhand'),
          android:      sum(eveningBranches, 'android'),
          ipad_macbook: sum(eveningBranches, 'ipad_macbook'),
          accessories:  sum(eveningBranches, 'accessories'),
          sold:         sum(eveningBranches, 'sold'),
        },
      },
    });
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ message: 'Failed to load dashboard data' });
  }
});

module.exports = router;
