const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// GET routes
router.get('/current', (req, res, next) => sensorController.getCurrentStatus(req, res, next));
router.get('/history', (req, res, next) => sensorController.getHistory(req, res, next));
router.get('/daily-stats', (req, res, next) => sensorController.getDailyStats(req, res, next));
router.get('/performance-metrics', (req, res, next) => sensorController.getPerformanceMetrics(req, res, next));

// POST routes (Control & Reset)
router.post('/reset-input-counter', (req, res, next) => sensorController.resetInputCounter(req, res, next));
router.post('/reset-output-counter', (req, res, next) => sensorController.resetOutputCounter(req, res, next));
router.post('/reset-all-counters', (req, res, next) => sensorController.resetAllCounters(req, res, next));

module.exports = router;
