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
