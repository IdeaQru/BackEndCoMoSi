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
