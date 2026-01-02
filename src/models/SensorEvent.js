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
