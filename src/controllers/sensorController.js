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
