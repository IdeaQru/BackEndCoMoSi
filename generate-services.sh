#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Generate Services Layer - Photosensor Backend
# Services yang dibuat:
# 1. finsService.js        ⭐ CRITICAL - FINS Protocol
# 2. pollingService.js     ⭐ CRITICAL - Background Polling
# 3. sensorService.js      - Business Logic
# 4. dataService.js        - Database Operations
# 5. websocketService.js   - WebSocket Broadcasting
# ============================================================

ROOT_DIR="$(pwd)"
SERVICES_DIR="$ROOT_DIR/src/services"

mkdir -p "$SERVICES_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Generating Services in: $SERVICES_DIR"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# 1. finsService.js - FINS Protocol Communication ⭐
# ============================================================

cat > "$SERVICES_DIR/finsService.js" <<'EOFINS'
const logger = require('../utils/logger');
const config = require('../config/environment');
const finsConfig = require('../config/fins');
const Helpers = require('../utils/helpers');

class FinsService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.lastUpdate = null;
    this.retryCount = 0;
    this.initialize();
  }

  initialize() {
    try {
      const fins = require('omron-fins');
      
      this.client = fins.FinsClient({
        host: finsConfig.host,
        port: finsConfig.port,
        timeout: finsConfig.timeout,
        retries: finsConfig.retries,
        debug: false
      });

      this.attachEventHandlers();
      logger.info('FINS Service initialized');
    } catch (error) {
      logger.error('Failed to initialize FINS Service:', error);
      this.scheduleReconnect();
    }
  }

  attachEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.isConnected = true;
      this.retryCount = 0;
      logger.info('✓ PLC connected via FINS Protocol');
    });

    this.client.on('error', (error) => {
      logger.error('FINS Protocol error:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('PLC disconnected');
      this.scheduleReconnect();
    });
  }

  scheduleReconnect() {
    this.retryCount++;
    if (this.retryCount < finsConfig.retries) {
      const delay = finsConfig.retryDelay * this.retryCount;
      logger.info(`Scheduling reconnect attempt ${this.retryCount} in ${delay}ms`);
      setTimeout(() => this.initialize(), delay);
    }
  }

  async readSensorData() {
    return await Helpers.retryOperation(async () => {
      if (!this.client || !this.isConnected) {
        throw new Error('PLC not connected');
      }

      return new Promise((resolve, reject) => {
        this.client.read('D100', 4, (error, data) => {
          if (error) {
            logger.error('FINS read error:', error);
            reject(error);
          } else {
            try {
              const result = Helpers.parseFinsResponse(data);
              this.lastUpdate = result;
              resolve(result);
            } catch (parseError) {
              reject(parseError);
            }
          }
        });
      });
    });
  }

  async writeData(address, data) {
    return await Helpers.retryOperation(async () => {
      if (!this.client || !this.isConnected) {
        throw new Error('PLC not connected');
      }

      return new Promise((resolve, reject) => {
        this.client.write(address, [data], (error) => {
          if (error) {
            logger.error('FINS write error:', error);
            reject(error);
          } else {
            logger.debug(`Write successful to ${address}: ${data}`);
            resolve(true);
          }
        });
      });
    });
  }

  async resetCounter(counterAddress) {
    return await this.writeData(counterAddress, 0);
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      lastUpdate: this.lastUpdate,
      retryCount: this.retryCount,
      plcIp: finsConfig.host,
      plcPort: finsConfig.port
    };
  }

  disconnect() {
    if (this.client) {
      this.client.close();
      this.isConnected = false;
      logger.info('FINS Service disconnected');
    }
  }
}

module.exports = new FinsService();
EOFINS

echo "✅ Created: src/services/finsService.js ⭐"

# ============================================================
# 2. pollingService.js - Background Polling ⭐
# ============================================================

cat > "$SERVICES_DIR/pollingService.js" <<'EOFPOLLING'
const logger = require('../utils/logger');
const finsService = require('./finsService');
const dataService = require('./dataService');
const WebSocketService = require('./websocketService');
const config = require('../config/environment');

class PollingService {
  constructor() {
    this.isRunning = false;
    this.pollInterval = null;
    this.pollingDelay = config.PLC.POLLING_INTERVAL || 200;
    this.lastPollTime = null;
    this.pollCount = 0;
    this.errorCount = 0;
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
      const sensorData = await finsService.readSensorData();

      const pollDuration = Date.now() - startTime;
      this.lastPollTime = new Date();
      this.pollCount++;

      await dataService.logSensorData({
        counterInput: sensorData.counterInput,
        counterOutput: sensorData.counterOutput,
        statusInput: sensorData.statusInput,
        statusOutput: sensorData.statusOutput,
        timestamp: sensorData.timestamp
      });

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
EOFPOLLING

echo "✅ Created: src/services/pollingService.js ⭐"

# ============================================================
# 3. sensorService.js - Business Logic
# ============================================================

cat > "$SERVICES_DIR/sensorService.js" <<'EOFSENSOR'
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
EOFSENSOR

echo "✅ Created: src/services/sensorService.js"

# ============================================================
# 4. dataService.js - Database Operations
# ============================================================

cat > "$SERVICES_DIR/dataService.js" <<'EOFDATA'
const pool = require('../config/database');
const logger = require('../utils/logger');

class DataService {
  async logSensorData(data) {
    try {
      const query = `
        INSERT INTO sensor_logs 
        (counter_input, counter_output, status_input, status_output, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [
        data.counterInput,
        data.counterOutput,
        data.statusInput,
        data.statusOutput,
        data.timestamp
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error logging sensor data:', error);
      throw error;
    }
  }

  async logSensorEvent(sensorType, eventType) {
    try {
      const query = `
        INSERT INTO sensor_events (sensor_type, event_type, timestamp)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const values = [sensorType, eventType];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error logging sensor event:', error);
      throw error;
    }
  }

  async logSystemEvent(eventType, description) {
    try {
      const query = `
        INSERT INTO system_events (event_type, description, timestamp)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const values = [eventType, description];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error logging system event:', error);
      throw error;
    }
  }

  async getHistoricalData(limit = 100, offset = 0) {
    try {
      const query = `
        SELECT * FROM sensor_logs
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2
      `;
      
      const values = [limit, offset];
      const result = await pool.query(query, values);
      
      return {
        data: result.rows,
        count: result.rows.length,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error getting historical data:', error);
      throw error;
    }
  }

  async getDailyStatistics(date = new Date()) {
    try {
      const query = `
        SELECT 
          DATE(timestamp) as date,
          MAX(counter_input) as total_input,
          MAX(counter_output) as total_output,
          AVG(counter_input) as avg_input,
          COUNT(*) as log_count,
          MIN(timestamp) as start_time,
          MAX(timestamp) as end_time
        FROM sensor_logs
        WHERE DATE(timestamp) = $1
        GROUP BY DATE(timestamp)
      `;
      
      const dateStr = date.toISOString().split('T')[0];
      const result = await pool.query(query, [dateStr]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting daily statistics:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(days = 7) {
    try {
      const query = `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as total_logs,
          SUM(CASE WHEN status_input = 1 THEN 1 ELSE 0 END) as input_detections,
          SUM(CASE WHEN status_output = 1 THEN 1 ELSE 0 END) as output_detections
        FROM sensor_logs
        WHERE timestamp >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  async saveSystemConfig(config) {
    try {
      const query = `
        UPDATE system_config
        SET plc_ip = $1, plc_port = $2, polling_interval = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
      `;
      
      const values = [config.plcIp, config.plcPort, config.pollingInterval];
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving system config:', error);
      throw error;
    }
  }

  async getSystemConfig() {
    try {
      const query = 'SELECT * FROM system_config WHERE id = 1';
      const result = await pool.query(query);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting system config:', error);
      throw error;
    }
  }
}

module.exports = new DataService();
EOFDATA

echo "✅ Created: src/services/dataService.js"

# ============================================================
# 5. websocketService.js - WebSocket Broadcasting
# ============================================================

cat > "$SERVICES_DIR/websocketService.js" <<'EOFWEBSOCKET'
const logger = require('../utils/logger');

class WebSocketService {
  static broadcastSensorUpdate(io, data) {
    if (!io) {
      logger.warn('Socket.IO instance not available');
      return;
    }

    try {
      io.to('sensor-updates').emit('sensor:update', {
        ...data,
        timestamp: new Date(),
        type: 'sensor_update'
      });

      logger.debug('Sensor update broadcasted to clients');
    } catch (error) {
      logger.error('Error broadcasting sensor update:', error);
    }
  }

  static broadcastSensorEvent(io, sensorType, eventType) {
    if (!io) return;

    try {
      io.to('sensor-updates').emit('sensor:event', {
        sensorType,
        eventType,
        timestamp: new Date(),
        type: 'sensor_event'
      });

      logger.debug(`Sensor event broadcasted: ${sensorType} - ${eventType}`);
    } catch (error) {
      logger.error('Error broadcasting sensor event:', error);
    }
  }

  static broadcastPlcStatus(io, status) {
    if (!io) return;

    try {
      const eventName = status.isConnected ? 'plc:connected' : 'plc:disconnected';
      
      io.emit(eventName, {
        ...status,
        timestamp: new Date()
      });

      logger.debug(`PLC status broadcasted: ${eventName}`);
    } catch (error) {
      logger.error('Error broadcasting PLC status:', error);
    }
  }

  static broadcastSystemAlert(io, alertType, message) {
    if (!io) return;

    try {
      io.emit('system:alert', {
        alertType,
        message,
        timestamp: new Date(),
        type: 'system_alert'
      });

      logger.warn(`System alert broadcasted: ${alertType} - ${message}`);
    } catch (error) {
      logger.error('Error broadcasting system alert:', error);
    }
  }
}

module.exports = WebSocketService;
EOFWEBSOCKET

echo "✅ Created: src/services/websocketService.js"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║         ✅ All Services Generated Successfully!        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Created Services:"
echo "   1. ⭐ finsService.js        - FINS Protocol Comm"
echo "   2. ⭐ pollingService.js     - Background Polling"
echo "   3. sensorService.js       - Business Logic"
echo "   4. dataService.js         - Database Ops"
echo "   5. websocketService.js    - WebSocket Broadcast"
echo ""
echo "🎯 Next: Run generate-controllers.sh"
echo "═══════════════════════════════════════════════════════════"
