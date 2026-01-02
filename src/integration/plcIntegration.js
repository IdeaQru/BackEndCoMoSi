const logger = require('../utils/logger');
const finsService = require('../services/finsService');
const sensorService = require('../services/sensorService'); // boleh tetap, walau tidak dipakai di sini
const pollingService = require('../services/pollingService');
const WebSocketService = require('../services/websocketService');

class PlcIntegration {
  constructor() {
    this.isInitialized = false;
    this.io = null;
    this.startTime = null;

    // Reconnect/monitor
    this.reconnectDelay = 10000; // 10 detik
    this.reconnectAttempts = 0;
    this.isPlcConnected = false;

    // loop control (hindari overlap)
    this._monitorTimer = null;
    this._isChecking = false;

    // throttle log saat PLC down (biar tidak spam)
    this._lastDownLogAt = 0;
    this._downLogEveryMs = 30000; // log warning minimal 30 detik sekali saat down
  }

  async initialize(io) {
    if (this.isInitialized) {
      logger.warn('PLC Integration already initialized');
      return;
    }

    this.io = io;
    this.startTime = Date.now();
    this.isInitialized = true;

    logger.info('═══════════════════════════════════════════════════');
    logger.info('Initializing PLC Integration...');
    logger.info('═══════════════════════════════════════════════════');

    // Broadcast system alert
    if (this.io) {
      WebSocketService.broadcastSystemAlert(
        this.io,
        'integration_started',
        'System started, monitoring PLC connection...'
      );
    }

    // Start monitor loop (jalan terus)
    this.startReconnectLoop(true);
  }

  /**
   * Check PLC connection by doing an actual test.
   * IMPORTANT: ini harus call finsService.testConnection() yang benar-benar ngetes UDP.
   */
  async checkPLCConnection() {
    try {
      const ok = await finsService.testConnection();
      const status = finsService.getStatus ? finsService.getStatus() : {};

      if (ok) {
        logger.info(`✅ PLC connection verified`);
        if (status?.plcIp && status?.plcPort) {
          logger.info(`    IP: ${status.plcIp}:${status.plcPort}`);
        }
        return true;
      }

      // PLC down: throttle warning log
      const now = Date.now();
      if (now - this._lastDownLogAt >= this._downLogEveryMs) {
        this._lastDownLogAt = now;
        logger.warn(`⚠️  PLC is not connected`);
        if (status?.plcIp && status?.plcPort) {
          logger.warn(`    Target: ${status.plcIp}:${status.plcPort}`);
        }
      }

      return false;
    } catch (error) {
      logger.error('PLC connection check failed:', error?.message || error);
      return false;
    }
  }

  /**
   * Start monitor loop. Tidak dihentikan saat PLC connect,
   * supaya ketika PLC mati lagi, backend bisa detect dan broadcast status.
   */
  startReconnectLoop(runImmediately = false) {
    if (this._monitorTimer) {
      clearTimeout(this._monitorTimer);
      this._monitorTimer = null;
    }

    const tick = async () => {
      if (!this.isInitialized) return;

      // hindari overlap
      if (this._isChecking) {
        this._scheduleNextTick();
        return;
      }

      this._isChecking = true;
      this.reconnectAttempts++;

      try {
        logger.debug(`🔄 PLC monitor tick #${this.reconnectAttempts}`);

        const connected = await this.checkPLCConnection();

        // Transition: DISCONNECTED -> CONNECTED
        if (connected && !this.isPlcConnected) {
          await this._handlePlcConnected();
        }

        // Transition: CONNECTED -> DISCONNECTED
        if (!connected && this.isPlcConnected) {
          await this._handlePlcDisconnected();
        }

        // else: no change, do nothing
      } catch (err) {
        logger.error('PLC monitor loop error:', err?.message || err);
      } finally {
        this._isChecking = false;
        this._scheduleNextTick();
      }
    };

    // run now or next interval
    if (runImmediately) {
      tick();
    } else {
      this._monitorTimer = setTimeout(tick, this.reconnectDelay);
    }

    logger.info(
      `🔄 PLC monitor loop started (interval: ${this.reconnectDelay / 1000}s)`
    );
  }

  _scheduleNextTick() {
    if (!this.isInitialized) return;
    if (this._monitorTimer) clearTimeout(this._monitorTimer);
    this._monitorTimer = setTimeout(async () => {
      // panggil tick via startReconnectLoop style (tanpa re-init)
      // supaya tetap single-timer
      if (!this.isInitialized) return;

      // inline tick
      if (this._isChecking) {
        this._scheduleNextTick();
        return;
      }

      this._isChecking = true;
      this.reconnectAttempts++;

      try {
        logger.debug(`🔄 PLC monitor tick #${this.reconnectAttempts}`);

        const connected = await this.checkPLCConnection();

        if (connected && !this.isPlcConnected) {
          await this._handlePlcConnected();
        }

        if (!connected && this.isPlcConnected) {
          await this._handlePlcDisconnected();
        }
      } catch (err) {
        logger.error('PLC monitor loop error:', err?.message || err);
      } finally {
        this._isChecking = false;
        this._scheduleNextTick();
      }
    }, this.reconnectDelay);
  }

  async _handlePlcConnected() {
    logger.warn('════════════════════════════════════════════════════');
    logger.info(`✅ PLC CONNECTED`);
    logger.warn('════════════════════════════════════════════════════');

    this.isPlcConnected = true;

    // Start polling jika belum running
    const pStatus = pollingService.getStatus ? pollingService.getStatus() : {};
    if (!pStatus?.isRunning) {
      logger.info('Starting polling service...');
      pollingService.start(this.io);
    }

    // Broadcast PLC status
    if (this.io) {
      WebSocketService.broadcastPlcStatus(this.io, {
        isConnected: true,
        message: 'PLC connected',
        timestamp: new Date()
      });
    }

    // FORCE BROADCAST snapshot 1x setelah connect (biar frontend langsung update)
    try {
      const snapshot = await finsService.readSensorData();
      if (this.io) {
        WebSocketService.broadcastSensorUpdate(this.io, snapshot);
      }
      logger.info('📡 Snapshot broadcasted after PLC reconnect');
    } catch (e) {
      logger.warn('Failed to broadcast snapshot after reconnect:', e?.message || e);
    }
  }

  async _handlePlcDisconnected() {
    logger.warn('════════════════════════════════════════════════════');
    logger.warn(`⚠️  PLC DISCONNECTED`);
    logger.warn('════════════════════════════════════════════════════');

    this.isPlcConnected = false;

    // Stop polling jika running
    try {
      pollingService.stop();
    } catch (e) {
      logger.warn('Polling stop error:', e?.message || e);
    }

    // Broadcast PLC status
    if (this.io) {
      WebSocketService.broadcastPlcStatus(this.io, {
        isConnected: false,
        message: 'PLC disconnected, retrying...',
        timestamp: new Date()
      });
    }
  }

  stopReconnectLoop() {
    if (this._monitorTimer) {
      clearTimeout(this._monitorTimer);
      this._monitorTimer = null;
    }
    this._isChecking = false;
    logger.info('PLC monitor loop stopped');
  }

  shutdown() {
    logger.info('═══════════════════════════════════════════════════');
    logger.info('Shutting down PLC Integration...');

    try {
      this.stopReconnectLoop();
      pollingService.stop();
      finsService.disconnect();

      this.isInitialized = false;
      this.isPlcConnected = false;

      logger.info('✅ PLC Integration shutdown complete');
      logger.info('═══════════════════════════════════════════════════');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }

  getStatus() {
    const finsStatus = finsService.getStatus ? finsService.getStatus() : {};
    const pollingStatus = pollingService.getStatus ? pollingService.getStatus() : {};

    return {
      isInitialized: this.isInitialized,
      isPlcConnected: this.isPlcConnected,
      uptime: this.startTime ? Date.now() - this.startTime : null,
      reconnect: {
        isMonitoring: this._monitorTimer !== null,
        attempts: this.reconnectAttempts,
        intervalMs: this.reconnectDelay
      },
      fins: {
        isConnected: finsStatus.isConnected,
        host: finsStatus.plcIp,
        port: finsStatus.plcPort,
        lastUpdate: finsStatus.lastUpdate,
        lastError: finsStatus.lastError
      },
      polling: pollingStatus,
      timestamp: new Date()
    };
  }

  getHealthReport() {
    const status = this.getStatus();
    const isHealthy =
      status.isInitialized &&
      status.isPlcConnected &&
      status.polling?.isRunning &&
      (status.polling?.errorCount ?? 0) < 3;

    return {
      healthy: isHealthy,
      status: isHealthy ? 'OK' : (status.isPlcConnected ? 'WARNING' : 'RECONNECTING'),
      details: status,
      checklist: {
        'Integration Initialized': status.isInitialized ? '✅' : '❌',
        'PLC Connected': status.isPlcConnected ? '✅' : '⚠️',
        'Polling Running': status.polling?.isRunning ? '✅' : '⏸️',
        'Error Count < 3': (status.polling?.errorCount ?? 0) < 3 ? '✅' : '⚠️'
      }
    };
  }
}

module.exports = new PlcIntegration();
