const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fj-dashboard-trends-'));
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(tmpDir, 'inventory.trends.test.db');

const { initializeDatabase, pool } = require('../server/db');
const { seedDemoData } = require('../server/utils/seedDemoData');
const { getDashboardTrends } = require('../server/utils/dashboardTrends');

(async () => {
  try {
    await initializeDatabase();
    await seedDemoData({ date: '2026-06-08' });

    const trends = await getDashboardTrends('2026-06-08', 14);
    assert.equal(trends.daily.length, 14);
    assert.equal(trends.branchSales.length, 4);
    assert.ok(trends.daily.every(row => row.date && row.evening_units > 0));
    assert.ok(trends.daily.some(row => row.sold > 0));
    assert.ok(trends.branchSales.some(row => row.branch_name === 'IT Park'));
  } finally {
    if (pool.close) pool.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
