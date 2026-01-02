class Sensor {
  constructor(data = {}) {
    this.id = data.id || null;
    this.counterInput = data.counterInput || 0;
    this.counterOutput = data.counterOutput || 0;
    this.statusInput = data.statusInput || 0;
    this.statusOutput = data.statusOutput || 0;
    this.timestamp = data.timestamp || new Date();
  }

  isValid() {
    return typeof this.counterInput === 'number' &&
           typeof this.counterOutput === 'number' &&
           (this.statusInput === 0 || this.statusInput === 1) &&
           (this.statusOutput === 0 || this.statusOutput === 1);
  }

  getObjectCount() {
    return Math.max(0, this.counterInput - this.counterOutput);
  }

  toJSON() {
    return {
      id: this.id,
      counterInput: this.counterInput,
      counterOutput: this.counterOutput,
      statusInput: this.statusInput,
      statusOutput: this.statusOutput,
      objectsInSystem: this.getObjectCount(),
      timestamp: this.timestamp
    };
  }

  static fromDatabase(row) {
    return new Sensor({
      id: row.id,
      counterInput: row.counter_input,
      counterOutput: row.counter_output,
      statusInput: row.status_input,
      statusOutput: row.status_output,
      timestamp: row.timestamp
    });
  }
}

module.exports = Sensor;
