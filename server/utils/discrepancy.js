const { pool } = require('../db');

async function computeDiscrepancy(branchId, date) {
  // Run all 5 queries in parallel instead of sequentially
  const [
    { rows: morning },
    { rows: evening },
    { rows: sold },
    { rows: pullOuts },
    { rows: stockIns },
  ] = await Promise.all([
    pool.query(`
      SELECT unit_type, model, COALESCE(storage,'') AS storage, COALESCE(color,'') AS color, quantity
      FROM inventory_entries
      WHERE branch_id = $1 AND date = $2 AND session = 'morning'
    `, [branchId, date]),

    pool.query(`
      SELECT unit_type, model, COALESCE(storage,'') AS storage, COALESCE(color,'') AS color, quantity
      FROM inventory_entries
      WHERE branch_id = $1 AND date = $2 AND session = 'evening'
    `, [branchId, date]),

    pool.query(`
      SELECT unit_type, model, COALESCE(storage,'') AS storage, COALESCE(color,'') AS color, SUM(quantity)::int AS qty
      FROM sold_units
      WHERE branch_id = $1 AND date = $2
      GROUP BY unit_type, model, storage, color
    `, [branchId, date]),

    pool.query(`
      SELECT unit_type, model, COALESCE(storage,'') AS storage, COALESCE(color,'') AS color, SUM(quantity)::int AS qty
      FROM transfers
      WHERE from_branch_id = $1 AND date = $2 AND transfer_type = 'pull_out'
      GROUP BY unit_type, model, storage, color
    `, [branchId, date]),

    pool.query(`
      SELECT unit_type, model, COALESCE(storage,'') AS storage, COALESCE(color,'') AS color, SUM(quantity)::int AS qty
      FROM transfers
      WHERE to_branch_id = $1 AND date = $2 AND transfer_type = 'stock_in'
      GROUP BY unit_type, model, storage, color
    `, [branchId, date]),
  ]);

  const key = (r) => `${r.unit_type}|${r.model}|${r.storage}|${r.color}`;

  const soldMap  = Object.fromEntries(sold.map(r     => [key(r), r.qty]));
  const pullMap  = Object.fromEntries(pullOuts.map(r  => [key(r), r.qty]));
  const stockMap = Object.fromEntries(stockIns.map(r  => [key(r), r.qty]));
  const eveningMap = Object.fromEntries(evening.map(r => [key(r), r.quantity]));

  const allKeys = new Set([...morning.map(key), ...evening.map(key)]);
  const results = [];

  allKeys.forEach(k => {
    const morningRow = morning.find(r => key(r) === k);
    const [unit_type, model, storage, color] = k.split('|');

    const morning_qty      = morningRow ? morningRow.quantity : 0;
    const stock_ins        = stockMap[k] || 0;
    const pull_outs        = pullMap[k]  || 0;
    const sold_qty         = soldMap[k]  || 0;
    const expected_evening = morning_qty + stock_ins - pull_outs - sold_qty;
    const actual_evening   = eveningMap[k] !== undefined ? eveningMap[k] : null;
    const discrepancy      = actual_evening !== null ? actual_evening - expected_evening : null;

    let status = 'ok';
    if (discrepancy !== null) {
      if (discrepancy > 0) status = 'over';
      else if (discrepancy < 0) status = 'short';
    }

    results.push({
      unit_type, model, storage, color,
      morning_qty, stock_ins, pull_outs, sold: sold_qty,
      expected_evening, actual_evening, discrepancy, status,
    });
  });

  return results;
}

module.exports = { computeDiscrepancy };
