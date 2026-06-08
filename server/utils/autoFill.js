const { pool } = require('../db');

function getPreviousDate(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

async function getAutoFillEntries(branchId, date) {
  const prevDate = getPreviousDate(date);
  const { rows: entries } = await pool.query(`
    SELECT unit_type, model, storage, color, quantity
    FROM inventory_entries
    WHERE branch_id = $1 AND date = $2 AND session = 'evening'
    ORDER BY unit_type, model
  `, [branchId, prevDate]);
  return { sourceDate: prevDate, entries };
}

module.exports = { getAutoFillEntries };
