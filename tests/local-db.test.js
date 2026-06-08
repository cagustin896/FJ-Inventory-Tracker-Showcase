const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fj-inventory-db-'));
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(tmpDir, 'inventory.test.db');
delete process.env.DATABASE_URL;

const { initializeDatabase, pool } = require('../server/db');

(async () => {
  try {
    await initializeDatabase();

    const { rows: branches } = await pool.query('SELECT * FROM branches ORDER BY id');
    assert.deepEqual(
      branches.map(branch => branch.name),
      ['IT Park', 'Mandaue', 'Star Mall', 'Lapu-Lapu']
    );

    const { rows } = await pool.query(
      'INSERT INTO branches (name) VALUES ($1) RETURNING id, name',
      ['Portfolio Demo']
    );
    assert.equal(rows[0].name, 'Portfolio Demo');
    assert.ok(rows[0].id);

    await pool.query('UPDATE branches SET name = $1 WHERE id = $2', ['Demo Branch', rows[0].id]);
    const { rows: renamed } = await pool.query('SELECT * FROM branches WHERE id = $1', [rows[0].id]);
    assert.equal(renamed[0].name, 'Demo Branch');
  } finally {
    if (pool.close) pool.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
