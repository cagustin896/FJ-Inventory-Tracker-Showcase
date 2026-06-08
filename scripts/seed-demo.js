require('dotenv').config();
const { initializeDatabase, pool } = require('../server/db');
const { seedDemoData } = require('../server/utils/seedDemoData');

(async () => {
  try {
    await initializeDatabase();
    const date = process.argv[2];
    const result = await seedDemoData({ date });
    console.log(`Demo data seeded for ${result.date}`);
    console.log(`Inventory rows: ${result.inventoryEntries}`);
    console.log(`Accessory rows: ${result.accessoryEntries}`);
    console.log(`Sold rows: ${result.soldUnits}`);
    console.log(`Transfer rows: ${result.transfers}`);
    console.log(`Adjustment rows: ${result.adjustments}`);
  } catch (err) {
    console.error('Failed to seed demo data:', err);
    process.exitCode = 1;
  } finally {
    if (pool.close) pool.close();
  }
})();
