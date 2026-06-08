const express = require('express');
const cors = require('cors');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/branches',    require('./routes/branches'));
  app.use('/api/inventory',   require('./routes/inventory'));
  app.use('/api/sold',        require('./routes/sold'));
  app.use('/api/transfers',   require('./routes/transfers'));
  app.use('/api/accessories', require('./routes/accessories'));
  app.use('/api/reports',     require('./routes/reports'));
  app.use('/api/adjustments', require('./routes/adjustments'));
  app.use('/api/dashboard',   require('./routes/dashboard'));
  app.use('/api/settings',    require('./routes/settings'));

  return app;
}

module.exports = { createApp };
