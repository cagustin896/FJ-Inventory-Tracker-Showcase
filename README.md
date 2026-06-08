# F&J Gadgets Inventory System

A branch inventory tracker for phone and accessory stock. The app includes daily inventory entry, sold units, transfers, adjustments, dashboard summaries, and downloadable Excel reports.

## Portfolio Showcase Copy

This branch is the portfolio showcase copy. It keeps the same product UI as production, but `vercel.json` enables demo seeding so hosted previews open with realistic inventory, sales, transfer, report, and dashboard data.

Use `main` for the clean production product. Use this branch for screenshots, portfolio reviews, and client-facing demos.

## Tech Stack

- React + Vite + Tailwind CSS
- Node.js + Express
- SQLite for local/offline use, with optional Postgres support for hosted deployments
- ExcelJS report exports
- PM2 for Windows auto-start/process management

## Requirements

- Node.js 22
- PM2 for auto-start mode

## First-Time Setup

1. Install dependencies:
   ```cmd
   npm install
   ```

2. Create a local `.env` file:
   ```cmd
   copy .env.example .env
   ```

3. Edit `.env` and set:
   ```env
PORT=3000
NODE_ENV=development
DB_CLIENT=sqlite
SQLITE_DB_PATH=./database/inventory.sqlite
EXPORTS_PATH=./exports
   ```

4. Build the app interface:
   ```cmd
   npm run build
   ```

5. Start the server:
   ```cmd
   npm start
   ```

6. Open:
   ```text
  http://localhost:3000
  ```

If port `3000` is already used on your machine, set `PORT=3100` in `.env` and open `http://localhost:3100` instead.

## Auto-Start Setup

Run this once after `.env` is configured:

```cmd
setup-autostart.bat
```

Then create desktop shortcuts:

```cmd
create-shortcut.bat
```

## Useful Commands

```cmd
npm run build        Builds the React app
npm run test:local-db Verifies the local SQLite database setup
npm run test:demo-seed Verifies the portfolio demo dataset
npm run test:dashboard-trends Verifies API-backed KPI chart data
npm run seed:demo    Refreshes local demo inventory data
npm start            Starts the Express server
npm run dev          Starts the server with nodemon
npm run client       Starts the Vite dev server
npm run pm2:start    Starts the app with PM2
npm run pm2:stop     Stops the PM2 app
npm run pm2:restart  Restarts the PM2 app
npm run pm2:logs     Shows PM2 logs
```

## Vercel Deployment

This repo includes `vercel.json` and `api/index.js` so Vercel can deploy the React build and Express API together.

Recommended production environment variables:

```env
DB_CLIENT=postgres
DATABASE_URL=your_postgres_connection_string
NODE_ENV=production
VERCEL_SEED_DEMO=false
ALLOW_DEMO_SEED=false
```

Production does not seed sample data automatically. The `/api/settings/seed-demo` endpoint is disabled unless `ALLOW_DEMO_SEED=true` or `VERCEL_SEED_DEMO=true` is set for a separate demo environment.

For a portfolio preview without a hosted database, deploy the `codex/portfolio-showcase` branch or create a separate Vercel project with:

```env
VERCEL_SEED_DEMO=true
ALLOW_DEMO_SEED=true
VERCEL_DEMO_DATE=2026-06-08
```

That showcase environment uses temporary serverless storage and loads a fresh operating dataset on cold start. It is useful for screenshots and portfolio review, but it is not persistent storage.

If deploying from the CLI, use a lowercase Vercel project name such as:

```cmd
npx vercel link --yes --project fj-inventory-tracker
npx vercel build
npx vercel --prod
```

## Project Structure

```text
fj-inventory/
  server/              Backend API
    index.js           Express app entry point
    db.js              Local SQLite setup and query adapter
    routes/            API endpoints
    utils/             Business logic and Excel helpers
  client/              React frontend
    src/pages/         Dashboard, entry, reports, and settings views
    dist/              Built frontend files
  exports/             Generated Excel files
  ecosystem.config.js  PM2 configuration
```

## Project Notes

The app is designed as an operations console for branch inventory workflows. It can run fully offline on a local Windows machine, and it can also be deployed as a hosted preview for portfolio review.
