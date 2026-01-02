#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Generate Controllers (MVC) - Photosensor Backend
# Output:
# - src/controllers/sensorController.js
# - src/controllers/systemController.js
# ============================================================

ROOT_DIR="$(pwd)"
CONTROLLERS_DIR="$ROOT_DIR/src/controllers"

mkdir -p "$CONTROLLERS_DIR"

echo "[OK] Creating controllers in: $CONTROLLERS_DIR"

# -------------------------------
# sensorController.js
# -------------------------------
cat > "$CONTROLLERS_DIR/sensorController.js" <<'EOF'
const logger = require('../utils/logger');
const sensorService = require('../services/sensorService');
const Helpers = require('../utils/helpers');
const { HTTP_STATUS, SUCCESS } = require('../utils/constants');

class SensorController {
  async getCurrentStatus(req, res, next) {
    try {
      const data = await sensorService.getCurrentStatus();

      res.json(
        Helpers.formatResponse(true, data, SUCCESS.DATA_RETRIEVED, HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error in getCurrentStatus:', error);
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const offset = parseInt(req.query.offset, 10) || 0;

      const data = await sensorService.getHistory(limit, offset);

      res.json(
        Helpers.formatResponse(true, data, SUCCESS.DATA_RETRIEVED, HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error in getHistory:', error);
      next(error);
    }
  }

  async getDailyStats(req, res, next) {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      const stats = await sensorService.getDailyStats(date);

      res.json(
        Helpers.formatResponse(true, stats, SUCCESS.DATA_RETRIEVED, HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error in getDailyStats:', error);
      next(error);
    }
  }

  async getPerformanceMetrics(req, res, next) {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const metrics = await sensorService.getPerformanceMetrics(days);

      res.json(
        Helpers.formatResponse(true, metrics, SUCCESS.DATA_RETRIEVED, HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error in getPerformanceMetrics:', error);
      next(error);
    }
  }

  async resetInputCounter(req, res, next) {
    try {
      const result = await sensorService.resetInputCounter();

      res.json(
        Helpers.formatResponse(true, result, 'Input counter reset successfully', HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error in resetInputCounter:', error);
      next(error);
    }
  }

  async resetOutputCounter(req, res, next) {
    try {
      const result = await sensorService.resetOutputCounter();

      res.json(
        Helpers.formatResponse(true, result, 'Output counter reset successfully', HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error in resetOutputCounter:', error);
      next(error);
    }
  }

  async resetAllCounters(req, res, next) {
    try {
      const result = await sensorService.resetAllCounters();

      res.json(
        Helpers.formatResponse(true, result, 'All counters reset successfully', HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error in resetAllCounters:', error);
      next(error);
    }
  }
}

module.exports = new SensorController();
EOF

echo "[OK] Wrote: src/controllers/sensorController.js"

# -------------------------------
# systemController.js
# -------------------------------
cat > "$CONTROLLERS_DIR/systemController.js" <<'EOF'
const logger = require('../utils/logger');
const finsService = require('../services/finsService');
const dataService = require('../services/dataService');
const pollingService = require('../services/pollingService');
const Helpers = require('../utils/helpers');
const { HTTP_STATUS, SUCCESS } = require('../utils/constants');

class SystemController {
  async getHealth(req, res) {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json(
      Helpers.formatResponse(true, {
        status: 'healthy',
        uptime: `${Math.floor(uptime / 60)} minutes`,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`
        },
        timestamp: new Date()
      }, SUCCESS.DATA_RETRIEVED, HTTP_STATUS.OK)
    );
  }

  async getPlcStatus(req, res) {
    try {
      const finsStatus = finsService.getStatus();
      const pollingStatus = pollingService.getStatus();

      res.json(
        Helpers.formatResponse(true, {
          fins: finsStatus,
          polling: pollingStatus,
          timestamp: new Date()
        }, SUCCESS.DATA_RETRIEVED, HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error getting PLC status:', error);
      res.status(HTTP_STATUS.INTERNAL_ERROR).json(
        Helpers.formatError('Failed to get PLC status', HTTP_STATUS.INTERNAL_ERROR, error)
      );
    }
  }

  async getConfig(req, res, next) {
    try {
      const config = await dataService.getSystemConfig();

      res.json(
        Helpers.formatResponse(true, config, SUCCESS.DATA_RETRIEVED, HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error getting config:', error);
      next(error);
    }
  }

  async updateConfig(req, res, next) {
    try {
      const { plcIp, plcPort, pollingInterval } = req.body;

      if (!plcIp || !plcPort || !pollingInterval) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          Helpers.formatError('Missing required fields', HTTP_STATUS.BAD_REQUEST)
        );
      }

      const saved = await dataService.saveSystemConfig({
        plcIp,
        plcPort,
        pollingInterval
      });

      // Apply polling interval dynamically (optional)
      if (typeof pollingInterval === 'number') {
        pollingService.updateInterval(pollingInterval);
      } else {
        pollingService.updateInterval(parseInt(pollingInterval, 10));
      }

      res.json(
        Helpers.formatResponse(true, saved, 'Configuration updated successfully', HTTP_STATUS.OK)
      );
    } catch (error) {
      logger.error('Error updating config:', error);
      next(error);
    }
  }
}

module.exports = new SystemController();
EOF

echo "[OK] Wrote: src/controllers/systemController.js"
echo "[DONE] Controllers generated successfully."
