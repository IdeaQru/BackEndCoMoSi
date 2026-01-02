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
