const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

function fileSize(pathname) {
  try {
    return fs.statSync(pathname).size;
  } catch {
    return 0;
  }
}

function mb(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

async function getSettingsSummary() {
  const dbPath = path.resolve(process.env.SQLITE_DB_PATH || pool.dbPath || './database/inventory.sqlite');
  const exportsPath = path.resolve(process.env.EXPORTS_PATH || './exports');

  const [
    { rows: branchRows },
    { rows: inventoryRows },
    { rows: soldRows },
    { rows: transferRows },
    { rows: accessoryRows },
  ] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM branches'),
    pool.query(`
      SELECT
        COUNT(*)::int AS inventory_rows,
        COUNT(DISTINCT date)::int AS days_with_entries,
        MAX(date) AS latest_entry_date
      FROM inventory_entries
    `),
    pool.query('SELECT COALESCE(SUM(quantity), 0)::int AS sold_units FROM sold_units'),
    pool.query('SELECT COUNT(*)::int AS transfer_rows FROM transfers'),
    pool.query('SELECT COALESCE(SUM(quantity), 0)::int AS accessory_units FROM accessories_entries WHERE session = $1', ['evening']),
  ]);

  return {
    database: {
      client: (process.env.DB_CLIENT || 'sqlite').toLowerCase(),
      status: 'ready',
    },
    branches: {
      total: Number(branchRows[0]?.total || 0),
    },
    data: {
      inventoryRows: Number(inventoryRows[0]?.inventory_rows || 0),
      daysWithEntries: Number(inventoryRows[0]?.days_with_entries || 0),
      latestEntryDate: inventoryRows[0]?.latest_entry_date || null,
      soldUnits: Number(soldRows[0]?.sold_units || 0),
      transferRows: Number(transferRows[0]?.transfer_rows || 0),
      accessoryUnits: Number(accessoryRows[0]?.accessory_units || 0),
    },
    storage: {
      databasePath: dbPath,
      databaseSizeMb: mb(fileSize(dbPath)),
      exportsPath,
      exportsExists: fs.existsSync(exportsPath),
    },
  };
}

module.exports = { getSettingsSummary };
