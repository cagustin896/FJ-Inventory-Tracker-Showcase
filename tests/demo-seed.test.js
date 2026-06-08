const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fj-inventory-seed-'));
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(tmpDir, 'inventory.seed.test.db');

const { initializeDatabase, pool } = require('../server/db');
const { seedDemoData } = require('../server/utils/seedDemoData');

(async () => {
  try {
    await initializeDatabase();
    const date = '2026-06-07';

    const result = await seedDemoData({ date });
    assert.equal(result.date, date);
    assert.equal(result.daysSeeded, 14);
    assert.ok(result.inventoryEntries > 20);
    assert.ok(result.soldUnits > 5);

    const { rows: evening } = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0)::int AS total
       FROM inventory_entries
       WHERE date = $1 AND session = 'evening'`,
      [date]
    );
    assert.ok(evening[0].total > 100);

    const { rows: sold } = await pool.query(
      'SELECT * FROM sold_units WHERE date = $1 ORDER BY id',
      [date]
    );
    assert.ok(sold.some(row => row.model.includes('iPhone')));

    const { rows: days } = await pool.query(
      'SELECT COUNT(DISTINCT date)::int AS total_days FROM inventory_entries'
    );
    assert.equal(days[0].total_days, 14);

    await seedDemoData({ date });
    const { rows: soldAfterReseed } = await pool.query(
      'SELECT * FROM sold_units WHERE date = $1 ORDER BY id',
      [date]
    );
    assert.equal(soldAfterReseed.length, sold.length);
  } finally {
    if (pool.close) pool.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
