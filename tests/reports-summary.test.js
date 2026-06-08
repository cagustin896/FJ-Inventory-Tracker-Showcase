const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fj-reports-summary-'));
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(tmpDir, 'inventory.reports.test.db');

const { initializeDatabase, pool } = require('../server/db');
const { seedDemoData } = require('../server/utils/seedDemoData');
const { getReportsSummary } = require('../server/utils/reportsSummary');

(async () => {
  try {
    await initializeDatabase();
    await seedDemoData({ date: '2026-06-08' });

    const summary = await getReportsSummary(2026, 6);
    assert.equal(summary.period.year, 2026);
    assert.equal(summary.period.month, 6);
    assert.ok(summary.totals.soldUnits > 0);
    assert.ok(summary.totals.stockIns > 0);
    assert.ok(summary.totals.pullOuts > 0);
    assert.equal(summary.branchSales.length, 4);
    assert.ok(summary.categorySales.some(row => row.unit_type.includes('iPhone')));
    assert.ok(summary.dailySales.length >= 8);
  } finally {
    if (pool.close) pool.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
