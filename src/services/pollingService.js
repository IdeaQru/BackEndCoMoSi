const logger = require('../utils/logger');
const finsService = require('./finsService');
const dataService = require('./dataService');
const WebSocketService = require('./websocketService');
const config = require('../config/environment');

class PollingService {
  constructor() {
    this.isRunning = false;
    this.pollInterval = null;
    this.pollingDelay = config.PLC.POLLING_INTERVAL || 500;
    this.lastPollTime = null;
    this.pollCount = 0;
    this.errorCount = 0;

    // State terakhir yang BERHASIL DISIMPAN ke Database
    this.lastSavedState = {
      counterInput: null,
      counterOutput: null
      // Kita tidak perlu track statusInput/Output untuk logic save DB
    };
  }

  start(io) {
    if (this.isRunning) {
      logger.warn('Polling service already running');
      return;
    }

    this.io = io;
    this.isRunning = true;
    this.errorCount = 0;

    logger.info(`Starting polling service with interval: ${this.pollingDelay}ms`);

    this.pollInterval = setInterval(async () => {
      await this.poll();
    }, this.pollingDelay);

    this.poll();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.isRunning = false;
      logger.info('Polling service stopped');
    }
  }

  async poll() {
    const startTime = Date.now();

    try {
      // 1. Baca data realtime dari PLC
      const sensorData = await finsService.readSensorData();

      const pollDuration = Date.now() - startTime;
      this.lastPollTime = new Date();
      this.pollCount++;

      // -------------------------------------------------------------
      // LOGIC DATABASE: Hanya simpan jika ANGKA Counter bertambah/berubah
      // -------------------------------------------------------------
      const hasChanged = 
        sensorData.counterInput !== this.lastSavedState.counterInput ||
        sensorData.counterOutput !== this.lastSavedState.counterOutput;
      
      // CATATAN: statusInput (0/1) sengaja diabaikan di sini agar tidak memicu
      // insert database saat sensor hanya berkedip tapi barang belum lewat.

      if (hasChanged) {
        await dataService.logSensorData({
          counterInput: sensorData.counterInput,
          counterOutput: sensorData.counterOutput,
          statusInput: sensorData.statusInput,
          statusOutput: sensorData.statusOutput,
          timestamp: sensorData.timestamp
        });

        // Update state terakhir
        this.lastSavedState = {
          counterInput: sensorData.counterInput,
          counterOutput: sensorData.counterOutput
        };

        // logger.debug(`💾 DB Saved: In ${sensorData.counterInput} / Out ${sensorData.counterOutput}`);
      }


      // -------------------------------------------------------------
      // LOGIC SOCKET IO: Selalu kirim Realtime (termasuk kedipan sensor)
      // -------------------------------------------------------------
      if (this.io) {
        const formatted = {
          counterInput: sensorData.counterInput,
          counterOutput: sensorData.counterOutput,
          statusInput: sensorData.statusInput === 1,
          statusOutput: sensorData.statusOutput === 1,
          objectsInSystem: Math.max(0, sensorData.counterInput - sensorData.counterOutput),
          timestamp: sensorData.timestamp,
          pollDuration: `${pollDuration}ms`,
          pollCount: this.pollCount
        };

        WebSocketService.broadcastSensorUpdate(this.io, formatted);
      }

      this.errorCount = 0;

      if (this.pollCount % 10 === 0) {
        logger.debug(`Polling: ${this.pollCount} successful polls, duration: ${pollDuration}ms`);
      }

    } catch (error) {
      this.errorCount++;
      logger.error(`Poll error (attempt ${this.errorCount}):`, error.message);

      if (this.errorCount >= 3 && this.io) {
        WebSocketService.broadcastPlcStatus(this.io, {
          isConnected: false,
          error: error.message,
          lastAttempt: this.lastPollTime
        });
      }

      if (this.errorCount >= 10) {
        logger.error('Too many polling errors, stopping service');
        this.stop();
      }
    }
  }

  updateInterval(newInterval) {
    if (newInterval < 50 || newInterval > 5000) {
      throw new Error('Polling interval must be between 50 and 5000 ms');
    }

    this.pollingDelay = newInterval;
    
    if (this.isRunning) {
      this.stop();
      this.start(this.io);
    }

    logger.info(`Polling interval updated to ${newInterval}ms`);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.pollingDelay,
      lastPollTime: this.lastPollTime,
      totalPolls: this.pollCount,
      errorCount: this.errorCount
    };
  }
}

module.exports = new PollingService();
