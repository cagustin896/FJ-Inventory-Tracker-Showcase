const { pool } = require('../db');

function getPrevDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getNextDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function generateMorning(branchId, date) {
  const prevDate = getPrevDate(date);
  const client = await pool.connect();
  try {
    const { rows: eveningEntries } = await client.query(`
      SELECT unit_type, model, storage, color, quantity
      FROM inventory_entries
      WHERE branch_id = $1 AND date = $2 AND session = 'evening'
    `, [branchId, prevDate]);

    const { rows: eveningAccessories } = await client.query(`
      SELECT accessory, quantity
      FROM accessories_entries
      WHERE branch_id = $1 AND date = $2 AND session = 'evening'
    `, [branchId, prevDate]);

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM inventory_entries WHERE branch_id = $1 AND date = $2 AND session = 'morning'`,
      [branchId, date]
    );

    for (const e of eveningEntries) {
      await client.query(`
        INSERT INTO inventory_entries (branch_id, date, session, unit_type, model, storage, color, quantity)
        VALUES ($1, $2, 'morning', $3, $4, $5, $6, $7)
      `, [branchId, date, e.unit_type, e.model, e.storage, e.color, e.quantity]);
    }

    await client.query(
      `DELETE FROM accessories_entries WHERE branch_id = $1 AND date = $2 AND session = 'morning'`,
      [branchId, date]
    );

    for (const a of eveningAccessories) {
      await client.query(`
        INSERT INTO accessories_entries (branch_id, date, session, accessory, quantity)
        VALUES ($1, $2, 'morning', $3, $4)
        ON CONFLICT (branch_id, date, session, accessory)
        DO UPDATE SET quantity = EXCLUDED.quantity
      `, [branchId, date, a.accessory, a.quantity]);
    }

    await client.query('COMMIT');
    return { date, prevDate, inventoryCopied: eveningEntries.length, accessoriesCopied: eveningAccessories.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { generateMorning, getNextDate, getPrevDate };
