const express = require('express');
const router = express.Router();
const sensorRoutes = require('./sensorRoutes');
const systemRoutes = require('./systemRoutes');

// Mount routes
router.use('/sensors', sensorRoutes);
router.use('/system', systemRoutes);

// Root API info
router.get('/', (req, res) => {
  res.json({
    message: 'Photosensor Backend API',
    version: process.env.API_VERSION || 'v1',
    endpoints: {
      sensors: '/sensors',
      system: '/system'
    },
    status: 'online'
  });
});

module.exports = router;
