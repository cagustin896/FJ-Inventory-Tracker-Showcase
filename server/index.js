require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createApp } = require('./app');
const { initializeDatabase } = require('./db');

const app = createApp();
const PORT = process.env.PORT || 3000;

const clientBuild = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'F&J Inventory API running. Build the client with: cd client && npm run build' });
  });
}

initializeDatabase()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`F&J Inventory running at http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other app or set another PORT in .env, such as PORT=3100.`);
        process.exit(1);
      }
      throw err;
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
