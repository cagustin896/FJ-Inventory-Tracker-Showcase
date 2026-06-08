const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fj-settings-summary-'));
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(tmpDir, 'inventory.settings.test.db');
process.env.EXPORTS_PATH = path.join(tmpDir, 'exports');

const { initializeDatabase, pool } = require('../server/db');
const { seedDemoData } = require('../server/utils/seedDemoData');
const { getSettingsSummary } = require('../server/utils/settingsSummary');

(async () => {
  try {
    await initializeDatabase();
    await seedDemoData({ date: '2026-06-08' });

    const summary = await getSettingsSummary();
    assert.equal(summary.database.client, 'sqlite');
    assert.equal(summary.branches.total, 4);
    assert.equal(summary.data.daysWithEntries, 14);
    assert.equal(summary.data.latestEntryDate, '2026-06-08');
    assert.ok(summary.data.inventoryRows > 0);
    assert.ok(summary.storage.databasePath.endsWith('inventory.settings.test.db'));
    assert.ok(summary.storage.exportsPath.endsWith('exports'));
  } finally {
    if (pool.close) pool.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
