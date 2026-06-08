const { pool } = require('../db');

async function getReportsSummary(year, month) {
  const monthNumber = Number(month);
  const monthPadded = String(monthNumber).padStart(2, '0');
  const prefix = `${year}-${monthPadded}`;

  const [
    { rows: branchSales },
    { rows: categorySales },
    { rows: dailySales },
    { rows: transferTotals },
    { rows: recentTransfers },
    { rows: activeBranches },
  ] = await Promise.all([
    pool.query(`
      SELECT b.name AS branch_name, COALESCE(SUM(s.quantity), 0)::int AS sold
      FROM branches b
      LEFT JOIN sold_units s ON s.branch_id = b.id AND s.date LIKE $1
      GROUP BY b.id, b.name
      ORDER BY sold DESC, b.name
    `, [`${prefix}%`]),
    pool.query(`
      SELECT unit_type, COALESCE(SUM(quantity), 0)::int AS sold
      FROM sold_units
      WHERE date LIKE $1
      GROUP BY unit_type
      ORDER BY sold DESC, unit_type
    `, [`${prefix}%`]),
    pool.query(`
      SELECT date, COALESCE(SUM(quantity), 0)::int AS sold
      FROM sold_units
      WHERE date LIKE $1
      GROUP BY date
      ORDER BY date
    `, [`${prefix}%`]),
    pool.query(`
      SELECT transfer_type, COALESCE(SUM(quantity), 0)::int AS quantity
      FROM transfers
      WHERE date LIKE $1
      GROUP BY transfer_type
    `, [`${prefix}%`]),
    pool.query(`
      SELECT t.date, t.transfer_type, t.model, t.quantity,
             from_branch.name AS from_branch, to_branch.name AS to_branch, t.source_label
      FROM transfers t
      LEFT JOIN branches from_branch ON t.from_branch_id = from_branch.id
      LEFT JOIN branches to_branch ON t.to_branch_id = to_branch.id
      WHERE t.date LIKE $1
      ORDER BY t.date DESC, t.id DESC
      LIMIT 8
    `, [`${prefix}%`]),
    pool.query(`
      SELECT COUNT(DISTINCT branch_id)::int AS active_branches
      FROM sold_units
      WHERE date LIKE $1
    `, [`${prefix}%`]),
  ]);

  const stockIns = transferTotals.find(row => row.transfer_type === 'stock_in')?.quantity || 0;
  const pullOuts = transferTotals.find(row => row.transfer_type === 'pull_out')?.quantity || 0;
  const soldUnits = branchSales.reduce((sum, row) => sum + Number(row.sold || 0), 0);
  const reportDays = dailySales.length;

  return {
    period: { year: Number(year), month: monthNumber, prefix },
    totals: {
      soldUnits,
      stockIns: Number(stockIns || 0),
      pullOuts: Number(pullOuts || 0),
      netMovement: Number(stockIns || 0) - Number(pullOuts || 0),
      activeBranches: Number(activeBranches[0]?.active_branches || 0),
      reportDays,
    },
    branchSales: branchSales.map(row => ({ branch_name: row.branch_name, sold: Number(row.sold || 0) })),
    categorySales: categorySales.map(row => ({ unit_type: row.unit_type, sold: Number(row.sold || 0) })),
    dailySales: dailySales.map(row => ({ date: row.date, sold: Number(row.sold || 0) })),
    movement: transferTotals.map(row => ({
      transfer_type: row.transfer_type,
      quantity: Number(row.quantity || 0),
    })),
    recentTransfers: recentTransfers.map(row => ({
      date: row.date,
      transfer_type: row.transfer_type,
      model: row.model,
      quantity: Number(row.quantity || 0),
      from_branch: row.from_branch,
      to_branch: row.to_branch,
      source_label: row.source_label,
    })),
  };
}

module.exports = { getReportsSummary };
