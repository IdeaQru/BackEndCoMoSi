const dgram = require('dgram');
const logger = require('../utils/logger');

class FinsService {
  constructor() {
    this.plcIp = process.env.PLC_IP || '127.0.0.1';
    this.plcPort = parseInt(process.env.PLC_PORT || '9600', 10);
    this.isConnected = false;
    this.lastUpdate = null;
    this.lastError = null;
  }

  _sendFins(command) {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');

      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('PLC Timeout'));
      }, 2000);

      socket.on('message', (msg) => {
        clearTimeout(timeout);
        socket.close();
        resolve(msg);
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      socket.send(command, 0, command.length, this.plcPort, this.plcIp, (err) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  async _readWord(area, address) {
    const command = Buffer.from([
      0x80, 0x00, 0x02,
      0x00, 0x01, 0x00,
      0x00, 0x64, 0x00,
      0x01,
      0x01, 0x01,
      area,
      (address >> 8) & 0xFF,
      address & 0xFF,
      0x00,
      0x00, 0x01           // count = 1 word
    ]);

    const msg = await this._sendFins(command);

    if (msg.length < 14) throw new Error(`Response terlalu pendek: ${msg.length}`);

    const endCode = msg.readUInt16BE(12);
    if (endCode !== 0x0000) throw new Error(`FINS Error 0x${endCode.toString(16).padStart(4, '0')}`);

    const payload = msg.slice(14);

    if (payload.length === 0) throw new Error('Tidak ada data payload');
    if (payload.length === 1) return payload.readUInt8(0);
    return payload.readUInt16BE(0);
  }

  async testConnection() {
    try {
      await this._readWord(0x82, 5); // DM5 = counterInput
      this.isConnected = true;
      this.lastUpdate = new Date();
      return true;
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      logger.warn(`testConnection failed: ${err.message}`);
      return false;
    }
  }

  async readSensorData() {
    try {
      // D5/D6 = counter values (Total Input/Output)
      const counterInput  = await this._readWord(0x82, 5);  // DM5
      const counterOutput = await this._readWord(0x82, 6);  // DM6

      // D200/D201 = RPM values (RPM Motor Conveyor/Rotator)
      const rpmInput  = await this._readWord(0x82, 200); // DM200
      const rpmOutput = await this._readWord(0x82, 201); // DM201

      this.isConnected = true;
      this.lastUpdate = new Date();

      logger.info(`D5=${counterInput}, D6=${counterOutput}, D200=${rpmInput}, D201=${rpmOutput}`);

      return {
        counterInput,
        counterOutput,
        rpmInput,
        rpmOutput,
        timestamp: this.lastUpdate
      };

    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      logger.error('readSensorData error:', err.message);
      throw err;
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      plcIp: this.plcIp,
      plcPort: this.plcPort,
      lastUpdate: this.lastUpdate,
      lastError: this.lastError,
      mode: 'UDP_REALTIME'
    };
  }

  disconnect() {
    this.isConnected = false;
  }
}

module.exports = new FinsService();