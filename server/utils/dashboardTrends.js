const { pool } = require('../db');

function addDays(dateStr, offset) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

async function getDashboardTrends(date, days = 14) {
  const startDate = addDays(date, -(days - 1));
  const [
    { rows: inventoryRows },
    { rows: accessoryRows },
    { rows: soldRows },
    { rows: branchSales },
  ] = await Promise.all([
    pool.query(`
      SELECT
        date,
        COALESCE(SUM(quantity), 0)::int AS evening_units,
        COALESCE(SUM(CASE WHEN unit_type = 'Brand New (iPhone)' THEN quantity ELSE 0 END), 0)::int AS brand_new,
        COALESCE(SUM(CASE WHEN unit_type = 'Secondhand (iPhone)' THEN quantity ELSE 0 END), 0)::int AS secondhand,
        COALESCE(SUM(CASE WHEN unit_type = 'Android' THEN quantity ELSE 0 END), 0)::int AS android,
        COALESCE(SUM(CASE WHEN unit_type = 'iPad & MacBook' THEN quantity ELSE 0 END), 0)::int AS ipad_macbook
      FROM inventory_entries
      WHERE session = 'evening' AND date >= $1 AND date <= $2
      GROUP BY date
      ORDER BY date
    `, [startDate, date]),
    pool.query(`
      SELECT date, COALESCE(SUM(quantity), 0)::int AS accessories
      FROM accessories_entries
      WHERE session = 'evening' AND date >= $1 AND date <= $2
      GROUP BY date
      ORDER BY date
    `, [startDate, date]),
    pool.query(`
      SELECT date, COALESCE(SUM(quantity), 0)::int AS sold
      FROM sold_units
      WHERE date >= $1 AND date <= $2
      GROUP BY date
      ORDER BY date
    `, [startDate, date]),
    pool.query(`
      SELECT b.name AS branch_name, COALESCE(SUM(s.quantity), 0)::int AS sold
      FROM branches b
      LEFT JOIN sold_units s ON s.branch_id = b.id AND s.date >= $1 AND s.date <= $2
      GROUP BY b.id, b.name
      ORDER BY sold DESC, b.name
    `, [startDate, date]),
  ]);

  const byDate = new Map();
  for (let index = 0; index < days; index += 1) {
    const currentDate = addDays(startDate, index);
    byDate.set(currentDate, { date: currentDate, evening_units: 0, accessories: 0, sold: 0 });
  }

  inventoryRows.forEach(row => {
    const target = byDate.get(row.date);
    target.evening_units = Number(row.evening_units || 0);
    target.brand_new = Number(row.brand_new || 0);
    target.secondhand = Number(row.secondhand || 0);
    target.android = Number(row.android || 0);
    target.ipad_macbook = Number(row.ipad_macbook || 0);
  });
  accessoryRows.forEach(row => {
    byDate.get(row.date).accessories = Number(row.accessories || 0);
  });
  soldRows.forEach(row => {
    byDate.get(row.date).sold = Number(row.sold || 0);
  });

  return {
    range: { start: startDate, end: date, days },
    daily: Array.from(byDate.values()),
    branchSales: branchSales.map(row => ({
      branch_name: row.branch_name,
      sold: Number(row.sold || 0),
    })),
  };
}

module.exports = { getDashboardTrends };
