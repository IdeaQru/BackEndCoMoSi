class SystemConfig {
  constructor(data = {}) {
    this.id = data.id || 1;
    this.plcIp = data.plcIp || '192.168.1.100';
    this.plcPort = data.plcPort || 9600;
    this.pollingInterval = data.pollingInterval || 200;
    this.updatedAt = data.updatedAt || new Date();
  }

  isValid() {
    return this.plcIp &&
           typeof this.plcPort === 'number' &&
           typeof this.pollingInterval === 'number' &&
           this.plcPort > 0 && this.plcPort < 65535 &&
           this.pollingInterval >= 50 && this.pollingInterval <= 5000;
  }

  toJSON() {
    return {
      id: this.id,
      plcIp: this.plcIp,
      plcPort: this.plcPort,
      pollingInterval: this.pollingInterval,
      updatedAt: this.updatedAt
    };
  }

  static fromDatabase(row) {
    return new SystemConfig({
      id: row.id,
      plcIp: row.plc_ip,
      plcPort: row.plc_port,
      pollingInterval: row.polling_interval,
      updatedAt: row.updated_at
    });
  }
}

module.exports = SystemConfig;
