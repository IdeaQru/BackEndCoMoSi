const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { validateRequest } = require('../middleware/authMiddleware');
const Joi = require('joi');

// Schema Validation untuk Config Update
const configSchema = Joi.object({
  plcIp: Joi.string().ip().required(),
  plcPort: Joi.number().integer().min(1).max(65535).required(),
  pollingInterval: Joi.number().integer().min(50).max(10000).required()
});

router.get('/health', (req, res) => systemController.getHealth(req, res));
router.get('/plc-status', (req, res) => systemController.getPlcStatus(req, res));
router.get('/config', (req, res, next) => systemController.getConfig(req, res, next));

// Update config dengan validasi middleware
router.put('/config', validateRequest(configSchema), (req, res, next) => systemController.updateConfig(req, res, next));

module.exports = router;
