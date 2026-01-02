#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Generate Routes & Models - Photosensor Backend
# Output:
# - src/models/Sensor.js, SensorEvent.js, SystemConfig.js
# - src/routes/sensorRoutes.js, systemRoutes.js, index.js
# ============================================================

ROOT_DIR="$(pwd)"
MODELS_DIR="$ROOT_DIR/src/models"
ROUTES_DIR="$ROOT_DIR/src/routes"

# Buat direktori jika belum ada
mkdir -p "$MODELS_DIR"
mkdir -p "$ROUTES_DIR"

echo "------------------------------------------------"
echo "📂 Generating Models in: $MODELS_DIR"
echo "------------------------------------------------"

# -------------------------------
# 1. src/models/Sensor.js
# -------------------------------
cat > "$MODELS_DIR/Sensor.js" <<'EOF'
class Sensor {
  constructor(data = {}) {
    this.id = data.id || null;
    this.counterInput = data.counterInput || 0;
    this.counterOutput = data.counterOutput || 0;
    this.statusInput = data.statusInput || 0;
    this.statusOutput = data.statusOutput || 0;
    this.timestamp = data.timestamp || new Date();
  }

  isValid() {
    return typeof this.counterInput === 'number' &&
           typeof this.counterOutput === 'number' &&
           (this.statusInput === 0 || this.statusInput === 1) &&
           (this.statusOutput === 0 || this.statusOutput === 1);
  }

  getObjectCount() {
    return Math.max(0, this.counterInput - this.counterOutput);
  }

  toJSON() {
    return {
      id: this.id,
      counterInput: this.counterInput,
      counterOutput: this.counterOutput,
      statusInput: this.statusInput,
      statusOutput: this.statusOutput,
      objectsInSystem: this.getObjectCount(),
      timestamp: this.timestamp
    };
  }

  static fromDatabase(row) {
    return new Sensor({
      id: row.id,
      counterInput: row.counter_input,
      counterOutput: row.counter_output,
      statusInput: row.status_input,
      statusOutput: row.status_output,
      timestamp: row.timestamp
    });
  }
}

module.exports = Sensor;
EOF
echo "✅ Created: src/models/Sensor.js"

# -------------------------------
# 2. src/models/SensorEvent.js
# -------------------------------
cat > "$MODELS_DIR/SensorEvent.js" <<'EOF'
class SensorEvent {
  constructor(data = {}) {
    this.id = data.id || null;
    this.sensorType = data.sensorType || null;
    this.eventType = data.eventType || null;
    this.timestamp = data.timestamp || new Date();
  }

  isValid() {
    return this.sensorType && this.eventType &&
           ['input', 'output'].includes(this.sensorType) &&
           ['detected', 'cleared', 'error'].includes(this.eventType);
  }

  toJSON() {
    return {
      id: this.id,
      sensorType: this.sensorType,
      eventType: this.eventType,
      timestamp: this.timestamp
    };
  }

  static fromDatabase(row) {
    return new SensorEvent({
      id: row.id,
      sensorType: row.sensor_type,
      eventType: row.event_type,
      timestamp: row.timestamp
    });
  }
}

module.exports = SensorEvent;
EOF
echo "✅ Created: src/models/SensorEvent.js"

# -------------------------------
# 3. src/models/SystemConfig.js
# -------------------------------
cat > "$MODELS_DIR/SystemConfig.js" <<'EOF'
class SystemConfig {
  constructor(data = {}) {
    this.id = data.id || 1;
    this.plcIp = data.plcIp || '192.168.1.100';
    this.plcPort = data.plcPort || 9600;
    this.pollingInterval = data.pollingInterval || 200;
    this.updatedAt = data.updatedAt || new Date();
  }

  isValid() {
    return this.plcIp &&
           typeof this.plcPort === 'number' &&
           typeof this.pollingInterval === 'number' &&
           this.plcPort > 0 && this.plcPort < 65535 &&
           this.pollingInterval >= 50 && this.pollingInterval <= 5000;
  }

  toJSON() {
    return {
      id: this.id,
      plcIp: this.plcIp,
      plcPort: this.plcPort,
      pollingInterval: this.pollingInterval,
      updatedAt: this.updatedAt
    };
  }

  static fromDatabase(row) {
    return new SystemConfig({
      id: row.id,
      plcIp: row.plc_ip,
      plcPort: row.plc_port,
      pollingInterval: row.polling_interval,
      updatedAt: row.updated_at
    });
  }
}

module.exports = SystemConfig;
EOF
echo "✅ Created: src/models/SystemConfig.js"

echo ""
echo "------------------------------------------------"
echo "📂 Generating Routes in: $ROUTES_DIR"
echo "------------------------------------------------"

# -------------------------------
# 4. src/routes/sensorRoutes.js
# -------------------------------
cat > "$ROUTES_DIR/sensorRoutes.js" <<'EOF'
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
EOF
echo "✅ Created: src/routes/sensorRoutes.js"

# -------------------------------
# 5. src/routes/systemRoutes.js
# -------------------------------
cat > "$ROUTES_DIR/systemRoutes.js" <<'EOF'
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
EOF
echo "✅ Created: src/routes/systemRoutes.js"

# -------------------------------
# 6. src/routes/index.js
# -------------------------------
cat > "$ROUTES_DIR/index.js" <<'EOF'
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
EOF
echo "✅ Created: src/routes/index.js"

echo ""
echo "[DONE] All Routes and Models generated successfully."
