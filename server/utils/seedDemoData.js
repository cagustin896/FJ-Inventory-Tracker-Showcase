const { pool } = require('../db');

const UNIT_TYPES = {
  brandNew: 'Brand New (iPhone)',
  secondhand: 'Secondhand (iPhone)',
  android: 'Android',
  ipad: 'iPad & MacBook',
};

const DEMO_INVENTORY = {
  'IT Park': [
    [UNIT_TYPES.brandNew, 'iPhone 15 Pro Max', '256GB', 'Natural Titanium', 12, 9],
    [UNIT_TYPES.brandNew, 'iPhone 15 Pro', '128GB', 'Blue Titanium', 13, 10],
    [UNIT_TYPES.secondhand, 'iPhone 13 Pro', '256GB', 'Sierra Blue', 5, 4],
    [UNIT_TYPES.android, 'Samsung Galaxy S24 Ultra', '256GB', 'Titanium Gray', 4, 3],
    [UNIT_TYPES.ipad, 'iPad Air M2', '128GB', 'Space Gray', 3, 3],
  ],
  Mandaue: [
    [UNIT_TYPES.brandNew, 'iPhone 15', '128GB', 'Black', 15, 12],
    [UNIT_TYPES.brandNew, 'iPhone 14', '128GB', 'Purple', 7, 5],
    [UNIT_TYPES.secondhand, 'iPhone 12', '128GB', 'White', 6, 5],
    [UNIT_TYPES.android, 'Google Pixel 8 Pro', '128GB', 'Obsidian', 3, 2],
    [UNIT_TYPES.ipad, 'MacBook Air M2', '256GB', 'Midnight', 2, 2],
  ],
  'Star Mall': [
    [UNIT_TYPES.brandNew, 'iPhone 15 Plus', '128GB', 'Pink', 12, 10],
    [UNIT_TYPES.brandNew, 'iPhone 13', '128GB', 'Starlight', 6, 4],
    [UNIT_TYPES.secondhand, 'iPhone 11', '64GB', 'Black', 8, 6],
    [UNIT_TYPES.android, 'Samsung Galaxy A55', '256GB', 'Awesome Navy', 7, 6],
    [UNIT_TYPES.ipad, 'iPad 10th Gen', '64GB', 'Blue', 4, 3],
  ],
  'Lapu-Lapu': [
    [UNIT_TYPES.brandNew, 'iPhone 15 Pro', '256GB', 'White Titanium', 9, 7],
    [UNIT_TYPES.brandNew, 'iPhone 14 Plus', '128GB', 'Midnight', 5, 4],
    [UNIT_TYPES.secondhand, 'iPhone XR', '64GB', 'Coral', 5, 4],
    [UNIT_TYPES.android, 'Xiaomi 14', '512GB', 'Black', 4, 3],
    [UNIT_TYPES.ipad, 'MacBook Air M1', '256GB', 'Silver', 2, 1],
  ],
};

const DEMO_ACCESSORIES = {
  'IT Park': [['Tempered Glass', 42, 38], ['MagSafe Case', 22, 19], ['USB-C Cable', 30, 27]],
  Mandaue: [['Tempered Glass', 35, 31], ['Clear Case', 28, 24], ['Power Adapter', 18, 16]],
  'Star Mall': [['Tempered Glass', 30, 27], ['Camera Lens Protector', 24, 20], ['USB-C Cable', 25, 23]],
  'Lapu-Lapu': [['Tempered Glass', 28, 24], ['MagSafe Case', 17, 15], ['Power Bank', 12, 10]],
};

const DEMO_SOLD = {
  'IT Park': [
    [UNIT_TYPES.brandNew, 'iPhone 15 Pro Max', '256GB', 'Natural Titanium', 2],
    [UNIT_TYPES.brandNew, 'iPhone 15 Pro', '128GB', 'Blue Titanium', 2],
    [UNIT_TYPES.secondhand, 'iPhone 13 Pro', '256GB', 'Sierra Blue', 1],
  ],
  Mandaue: [
    [UNIT_TYPES.brandNew, 'iPhone 15', '128GB', 'Black', 3],
    [UNIT_TYPES.brandNew, 'iPhone 14', '128GB', 'Purple', 1],
    [UNIT_TYPES.android, 'Google Pixel 8 Pro', '128GB', 'Obsidian', 1],
  ],
  'Star Mall': [
    [UNIT_TYPES.brandNew, 'iPhone 13', '128GB', 'Starlight', 2],
    [UNIT_TYPES.secondhand, 'iPhone 11', '64GB', 'Black', 2],
    [UNIT_TYPES.ipad, 'iPad 10th Gen', '64GB', 'Blue', 1],
  ],
  'Lapu-Lapu': [
    [UNIT_TYPES.brandNew, 'iPhone 15 Pro', '256GB', 'White Titanium', 1],
    [UNIT_TYPES.android, 'Xiaomi 14', '512GB', 'Black', 1],
    [UNIT_TYPES.ipad, 'MacBook Air M1', '256GB', 'Silver', 1],
  ],
};

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr, offset) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function variedQuantity(base, dayIndex, branchIndex, rowIndex, kind = 'stock') {
  const wave = ((dayIndex + 1) * (branchIndex + 2) + rowIndex * 3) % 5;
  const seasonal = kind === 'sold' ? (dayIndex % 4) : ((13 - dayIndex) % 3);
  return Math.max(kind === 'sold' ? 1 : 0, base + wave - 2 + seasonal);
}

async function seedOneDay(client, byName, date, dayIndex, counts) {
  for (const [branchName, rows] of Object.entries(DEMO_INVENTORY)) {
    const branch = byName[branchName];
    if (!branch) continue;
    const branchIndex = Object.keys(DEMO_INVENTORY).indexOf(branchName);

    for (const [rowIndex, [unitType, model, storage, color, morningQty, eveningQty]] of rows.entries()) {
      const morning = variedQuantity(morningQty, dayIndex, branchIndex, rowIndex);
      const evening = Math.max(0, variedQuantity(eveningQty, dayIndex, branchIndex, rowIndex) + 2 - (dayIndex % 2));
      await client.query(`
        INSERT INTO inventory_entries (branch_id, date, session, unit_type, model, storage, color, quantity)
        VALUES ($1, $2, 'morning', $3, $4, $5, $6, $7)
      `, [branch.id, date, unitType, model, storage, color, morning]);
      await client.query(`
        INSERT INTO inventory_entries (branch_id, date, session, unit_type, model, storage, color, quantity)
        VALUES ($1, $2, 'evening', $3, $4, $5, $6, $7)
      `, [branch.id, date, unitType, model, storage, color, evening]);
      counts.inventoryEntries += 2;
    }

    for (const [rowIndex, [accessory, morningQty, eveningQty]] of DEMO_ACCESSORIES[branchName].entries()) {
      const morning = variedQuantity(morningQty, dayIndex, branchIndex, rowIndex);
      const evening = Math.max(0, variedQuantity(eveningQty, dayIndex, branchIndex, rowIndex) - 1);
      await client.query(`
        INSERT INTO accessories_entries (branch_id, date, session, accessory, quantity)
        VALUES ($1, $2, 'morning', $3, $4)
      `, [branch.id, date, accessory, morning]);
      await client.query(`
        INSERT INTO accessories_entries (branch_id, date, session, accessory, quantity)
        VALUES ($1, $2, 'evening', $3, $4)
      `, [branch.id, date, accessory, evening]);
      counts.accessoryEntries += 2;
    }

    for (const [rowIndex, [unitType, model, storage, color, quantity]] of DEMO_SOLD[branchName].entries()) {
      await client.query(`
        INSERT INTO sold_units (branch_id, date, unit_type, model, storage, color, quantity)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [branch.id, date, unitType, model, storage, color, variedQuantity(quantity, dayIndex, branchIndex, rowIndex, 'sold')]);
      counts.soldUnits += 1;
    }
  }

  const itPark = byName['IT Park'];
  const mandaue = byName.Mandaue;
  const starMall = byName['Star Mall'];
  const lapuLapu = byName['Lapu-Lapu'];
  const transfers = [
    [date, 'stock_in', null, itPark.id, 'Supplier', UNIT_TYPES.brandNew, 'iPhone 15 Pro Max', '256GB', 'Natural Titanium', 1 + (dayIndex % 3)],
    [date, 'stock_in', null, mandaue.id, 'Supplier', UNIT_TYPES.android, 'Google Pixel 8 Pro', '128GB', 'Obsidian', 1 + (dayIndex % 2)],
    [date, 'pull_out', itPark.id, starMall.id, null, UNIT_TYPES.brandNew, 'iPhone 15 Pro', '128GB', 'Blue Titanium', 1],
    [date, 'pull_out', starMall.id, lapuLapu.id, null, UNIT_TYPES.ipad, 'iPad 10th Gen', '64GB', 'Blue', 1 + (dayIndex % 2)],
  ];

  for (const transfer of transfers) {
    await client.query(`
      INSERT INTO transfers (date, transfer_type, from_branch_id, to_branch_id, source_label, unit_type, model, storage, color, quantity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, transfer);
    counts.transfers += 1;
  }

  await client.query(`
    INSERT INTO inventory_adjustments (branch_id, date, unit_type, model, storage, color, quantity, reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [mandaue.id, date, UNIT_TYPES.brandNew, 'iPhone 14', '128GB', 'Purple', -1, 'Display unit moved to service desk']);
  counts.adjustments += 1;
}

async function seedDemoData({ date = today(), days = 14 } = {}) {
  const client = await pool.connect();
  const counts = {
    date,
    daysSeeded: days,
    inventoryEntries: 0,
    accessoryEntries: 0,
    soldUnits: 0,
    transfers: 0,
    adjustments: 0,
  };

  try {
    await client.query('BEGIN');

    const { rows: branches } = await client.query('SELECT * FROM branches ORDER BY id');
    const byName = Object.fromEntries(branches.map(branch => [branch.name, branch]));
    const dates = Array.from({ length: days }, (_, index) => addDays(date, index - (days - 1)));
    const startDate = dates[0];

    await client.query('DELETE FROM inventory_adjustments WHERE date >= $1 AND date <= $2', [startDate, date]);
    await client.query('DELETE FROM transfers WHERE date >= $1 AND date <= $2', [startDate, date]);
    await client.query('DELETE FROM sold_units WHERE date >= $1 AND date <= $2', [startDate, date]);
    await client.query('DELETE FROM accessories_entries WHERE date >= $1 AND date <= $2', [startDate, date]);
    await client.query('DELETE FROM inventory_entries WHERE date >= $1 AND date <= $2', [startDate, date]);

    for (const [dayIndex, currentDate] of dates.entries()) {
      await seedOneDay(client, byName, currentDate, dayIndex, counts);
    }

    await client.query('COMMIT');
    return counts;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedDemoData };
