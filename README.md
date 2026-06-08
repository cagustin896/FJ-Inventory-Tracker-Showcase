# F&J Gadgets Inventory

A branch inventory operations console for F&J Gadgets. The app supports daily inventory entry, sold units, stock transfers, pull-outs, stock-ins, KPI dashboards, branch summaries, report analytics, settings, and downloadable Excel reports.

## Repository Split

This project is maintained in two GitHub repositories:

- **Production repo:** `FJ-Inventory-Tracker`
  - Private source for the live client-facing app.
  - Uses persistent Supabase Postgres in production.
  - Live app: https://f-j-inventory-tracker.vercel.app

- **Portfolio showcase repo:** `FJ-Inventory-Tracker-Showcase`
  - Public portfolio version for screenshots, reviews, and case-study links.
  - Uses the same product UI with seeded demo inventory data.
  - Showcase app: https://fj-inventory-tracker.vercel.app

Supabase is used for production data storage only. Browser branding, UI, routing, and deployments are handled by the React app and Vercel.

## Tech Stack

- React 19
- Vite 8
- React Router 7
- Tailwind CSS 3
- Lucide React icons
- Node.js 24
- Express 4
- PostgreSQL via `pg`
- SQLite-compatible local/offline database adapter
- ExcelJS report exports
- Vercel serverless deployment
- Supabase Postgres for production persistence
- PM2 scripts for optional Windows local auto-start

## Requirements

- Node.js 24.x
- npm
- Optional: PM2 for Windows auto-start/local process management
- Optional for production: Supabase Postgres connection string

## Local Development

Install dependencies:

```cmd
npm install
```

Create a local environment file:

```cmd
copy .env.example .env
```

Use SQLite for local development:

```env
PORT=3000
NODE_ENV=development
DB_CLIENT=sqlite
SQLITE_DB_PATH=./database/inventory.sqlite
EXPORTS_PATH=./exports
```

Build the frontend:

```cmd
npm run build
```

Start the Express server:

```cmd
npm start
```

Open:

```text
http://localhost:3000
```

If port `3000` is already in use, set a different `PORT` in `.env`, such as `3100`, then open `http://localhost:3100`.

## Development Commands

```cmd
npm run dev                       Starts the Express API with nodemon
npm run client                    Starts the Vite frontend dev server
npm run build                     Installs/builds the React frontend
npm start                         Starts the production-style Express server
npm run seed:demo                 Seeds local demo inventory data
npm run test:local-db             Verifies local database setup
npm run test:demo-seed            Verifies seeded portfolio data
npm run test:dashboard-trends     Verifies dashboard KPI trend data
npm run test:settings-summary     Verifies settings summary data
npm run test:reports-summary      Verifies reports summary data
```

## Production Setup

Production is deployed on Vercel and stores app data in Supabase Postgres.

Required Vercel environment variables:

```env
DB_CLIENT=postgres
DATABASE_URL=your_supabase_transaction_pooler_connection_string
VERCEL_SEED_DEMO=false
ALLOW_DEMO_SEED=false
EXPORTS_PATH=./exports
```

Production should not enable seeded demo data. Keep `VERCEL_SEED_DEMO=false` and `ALLOW_DEMO_SEED=false` so client-entered inventory records are stored in Supabase instead of being reset by demo seeding.

## Portfolio Showcase Setup

The showcase app is designed for a public portfolio link. It keeps the polished product UI but uses seeded operating data so dashboards, reports, and entry screens look complete immediately.

Recommended showcase Vercel variables:

```env
VERCEL_SEED_DEMO=true
ALLOW_DEMO_SEED=true
VERCEL_DEMO_DATE=2026-06-08
EXPORTS_PATH=./exports
```

The showcase dataset is meant for screenshots and demos. It should not be used as the client-facing production database.

## Vercel Deployment

This repo includes `vercel.json` and `api/index.js` so Vercel can deploy the React build and Express API together.

Production project:

```cmd
npx vercel link --yes --project f-j-inventory-tracker
npx vercel deploy --prod
```

Showcase project:

```cmd
npx vercel link --yes --project fj-inventory-tracker
npx vercel deploy --prod
```

## Optional PM2 Auto-Start

After `.env` is configured, PM2 can be used for a local Windows machine that should keep the app running:

```cmd
setup-autostart.bat
```

Desktop shortcuts can be created with:

```cmd
create-shortcut.bat
```

Useful PM2 commands:

```cmd
npm run pm2:start
npm run pm2:stop
npm run pm2:restart
npm run pm2:logs
```

## Project Structure

```text
F&J INVENTORY TRACKER/
  api/
    index.js              Vercel serverless entry point
  client/
    public/
      favicon.svg         Browser tab icon
    src/
      pages/              Dashboard, entry, reports, and settings screens
      components/         Shared React UI components
    dist/                 Built frontend assets
  server/
    index.js              Express app entry point
    db.js                 SQLite/Postgres database adapter
    routes/               API endpoints
    utils/                Business logic and report helpers
  scripts/
    seed-demo.js          Local/showcase demo data seeding
  tests/                  Node-based API/data verification scripts
  exports/                Generated Excel reports
  vercel.json             Vercel routing/build configuration
```

## Portfolio Notes

For case studies, use the public showcase repo and showcase Vercel URL. Keep the production repo private because it is connected to real client operations and Supabase data.

Do not commit `.env`, database files, exported reports, Supabase credentials, or client data. Use Vercel environment variables for hosted configuration.
