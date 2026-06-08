const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fj-branch-flow-'));
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(tmpDir, 'inventory.branch-flow.test.db');
delete process.env.DATABASE_URL;

const { createApp } = require('../server/app');
const { initializeDatabase, pool } = require('../server/db');

(async () => {
  let server;
  try {
    await initializeDatabase();
    const app = createApp();
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));

    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;
    const branchName = 'New Branch Flow';

    const createResponse = await fetch(`${baseUrl}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: branchName }),
    });
    assert.equal(createResponse.status, 200);

    const created = await createResponse.json();
    assert.equal(created.name, branchName);
    assert.ok(created.id);

    const branches = await (await fetch(`${baseUrl}/branches`)).json();
    assert.ok(branches.some(branch => branch.id === created.id && branch.name === branchName));

    const dashboard = await (await fetch(`${baseUrl}/dashboard/2026-06-09`)).json();
    const dashboardBranch = dashboard.evening.branches.find(branch => branch.branch_id === created.id);
    assert.ok(dashboardBranch);
    assert.equal(dashboardBranch.branch_name, branchName);
    assert.equal(dashboardBranch.has_data, false);

    const inventory = await (await fetch(`${baseUrl}/inventory/${created.id}/2026-06-09/evening`)).json();
    assert.deepEqual(inventory, []);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool.close) pool.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
