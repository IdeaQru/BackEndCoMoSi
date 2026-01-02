const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const finsService = require('./finsService');
const dataService = require('./dataService');

class SensorService {
  constructor() {
    this.lastSensorState = {
      statusInput: 0,
      statusOutput: 0
    };
  }

  async getCurrentStatus() {
    try {
      const sensorData = await finsService.readSensorData();
      
      await this.detectStateChanges(sensorData);
      
      return {
        counterInput: sensorData.counterInput,
        counterOutput: sensorData.counterOutput,
        statusInput: sensorData.statusInput === 1,
        statusOutput: sensorData.statusOutput === 1,
        objectsInSystem: Helpers.calculateObjectDifference(
          sensorData.counterInput,
          sensorData.counterOutput
        ),
        timestamp: sensorData.timestamp,
        plcStatus: 'connected'
      };
    } catch (error) {
      logger.error('Error getting sensor status:', error);
      return {
        plcStatus: 'disconnected',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async detectStateChanges(sensorData) {
    if (sensorData.statusInput !== this.lastSensorState.statusInput) {
      const eventType = sensorData.statusInput === 1 ? 'detected' : 'cleared';
      await dataService.logSensorEvent('input', eventType);
      logger.info(`Input sensor state changed to: ${eventType}`);
    }

    if (sensorData.statusOutput !== this.lastSensorState.statusOutput) {
      const eventType = sensorData.statusOutput === 1 ? 'detected' : 'cleared';
      await dataService.logSensorEvent('output', eventType);
      logger.info(`Output sensor state changed to: ${eventType}`);
    }

    this.lastSensorState = {
      statusInput: sensorData.statusInput,
      statusOutput: sensorData.statusOutput
    };
  }

  async resetInputCounter() {
    try {
      await finsService.resetCounter('D100');
      await dataService.logSystemEvent('counter_reset', 'input_counter_reset');
      logger.info('Input counter reset successfully');
      return { success: true, message: 'Input counter reset' };
    } catch (error) {
      logger.error('Error resetting input counter:', error);
      throw error;
    }
  }

  async resetOutputCounter() {
    try {
      await finsService.resetCounter('D101');
      await dataService.logSystemEvent('counter_reset', 'output_counter_reset');
      logger.info('Output counter reset successfully');
      return { success: true, message: 'Output counter reset' };
    } catch (error) {
      logger.error('Error resetting output counter:', error);
      throw error;
    }
  }

  async resetAllCounters() {
    try {
      await finsService.resetCounter('D100');
      await finsService.resetCounter('D101');
      await dataService.logSystemEvent('counter_reset', 'all_counters_reset');
      logger.info('All counters reset successfully');
      return { success: true, message: 'All counters reset' };
    } catch (error) {
      logger.error('Error resetting counters:', error);
      throw error;
    }
  }

  async getHistory(limit = 100, offset = 0) {
    try {
      const data = await dataService.getHistoricalData(limit, offset);
      return data;
    } catch (error) {
      logger.error('Error getting history:', error);
      throw error;
    }
  }

  async getDailyStats(date = new Date()) {
    try {
      const stats = await dataService.getDailyStatistics(date);
      return stats;
    } catch (error) {
      logger.error('Error getting daily stats:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(days = 7) {
    try {
      const metrics = await dataService.getPerformanceMetrics(days);
      return {
        period: `${days} days`,
        metrics: metrics,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }
}

module.exports = new SensorService();
