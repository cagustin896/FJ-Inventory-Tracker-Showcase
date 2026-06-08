require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_SQLITE_PATH = path.resolve(
  process.env.SQLITE_DB_PATH ||
  (process.env.VERCEL ? path.join(os.tmpdir(), 'fj-inventory.sqlite') : './database/inventory.sqlite')
);

function normalizeSqliteError(err) {
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    err.code = '23505';
  }
  return err;
}

function toSqliteStatement(sql, params = []) {
  const values = [];
  const statement = sql
    .replace(/\$(\d+)/g, (_, index) => {
      values.push(params[Number(index) - 1]);
      return '?';
    })
    .replace(/COUNT\(\*\)::int/gi, 'COUNT(*)')
    .replace(/SUM\(([^)]+)\)::int/gi, 'SUM($1)')
    .replace(/COALESCE\(SUM\(([^)]+)\),\s*0\)::int/gi, 'COALESCE(SUM($1), 0)')
    .replace(/::int/gi, '')
    .replace(/\bSERIAL\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/DEFAULT\s+NOW\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP')
    .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');

  return { statement, values };
}

function createSqlitePool() {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = DEFAULT_SQLITE_PATH;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');

  const runQuery = async (sql, params = []) => {
    const trimmed = sql.trim();
    const { statement, values } = toSqliteStatement(trimmed, params);

    try {
      if (/^(BEGIN|COMMIT|ROLLBACK)\b/i.test(statement)) {
        db.exec(statement);
        return { rows: [] };
      }

      const prepared = db.prepare(statement);
      const returnsRows = /^(SELECT|PRAGMA)\b/i.test(statement) || /\bRETURNING\b/i.test(statement);
      if (returnsRows) {
        const rows = prepared.all(...values);
        return { rows, rowCount: rows.length };
      }
      const result = prepared.run(...values);
      return { rows: [], rowCount: Number(result.changes || 0) };
    } catch (err) {
      throw normalizeSqliteError(err);
    }
  };

  return {
    query: runQuery,
    connect: async () => ({
      query: runQuery,
      release: () => {},
    }),
    close: () => db.close(),
    dbPath,
  };
}

function createPostgresPool() {
  const { Pool } = require('pg');
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

const dbClient = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
const pool = dbClient === 'postgres' ? createPostgresPool() : createSqlitePool();

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id   SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_entries (
        id         SERIAL PRIMARY KEY,
        branch_id  INTEGER NOT NULL REFERENCES branches(id),
        date       TEXT NOT NULL,
        session    TEXT NOT NULL CHECK(session IN ('morning','evening')),
        unit_type  TEXT NOT NULL,
        model      TEXT NOT NULL,
        storage    TEXT,
        color      TEXT,
        quantity   INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sold_units (
        id         SERIAL PRIMARY KEY,
        branch_id  INTEGER NOT NULL REFERENCES branches(id),
        date       TEXT NOT NULL,
        unit_type  TEXT NOT NULL,
        model      TEXT NOT NULL,
        storage    TEXT,
        color      TEXT,
        quantity   INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id              SERIAL PRIMARY KEY,
        date            TEXT NOT NULL,
        transfer_type   TEXT NOT NULL CHECK(transfer_type IN ('pull_out','stock_in')),
        from_branch_id  INTEGER REFERENCES branches(id),
        to_branch_id    INTEGER REFERENCES branches(id),
        source_label    TEXT,
        unit_type       TEXT NOT NULL,
        model           TEXT NOT NULL,
        storage         TEXT,
        color           TEXT,
        quantity        INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS accessories_entries (
        id         SERIAL PRIMARY KEY,
        branch_id  INTEGER NOT NULL REFERENCES branches(id),
        date       TEXT NOT NULL,
        session    TEXT NOT NULL CHECK(session IN ('morning','evening')),
        accessory  TEXT NOT NULL,
        quantity   INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(branch_id, date, session, accessory)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id         SERIAL PRIMARY KEY,
        branch_id  INTEGER NOT NULL REFERENCES branches(id),
        date       TEXT NOT NULL,
        unit_type  TEXT NOT NULL,
        model      TEXT NOT NULL,
        storage    TEXT,
        color      TEXT,
        quantity   INTEGER NOT NULL,
        reason     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO branches (name)
      VALUES ('IT Park'), ('Mandaue'), ('Star Mall'), ('Lapu-Lapu')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log(`[db] ${dbClient} database initialized successfully`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[db] Initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase };
