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

  /**
   * 1. Method wajib untuk PlcIntegration: testConnection
   * Melakukan tes koneksi nyata ke simulator
   */
  async testConnection() {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      const timeout = setTimeout(() => {
        socket.close();
        this.isConnected = false;
        resolve(false);
      }, 1000); // 1 detik timeout

      // Kirim command FINS sederhana (Read D100 1 Word)
      const command = Buffer.from([
        0x80, 0x00, 0x02,       // Header
        0x00, 0x00, 0x00,       // Dest
        0x00, 0x00, 0x00,       // Source
        0x00,                   // SID
        0x01, 0x01,             // Command Read
        0x82, 0x00, 0x64, 0x00, // Address D100
        0x00, 0x01              // Count 1
      ]);

      socket.send(command, 0, command.length, this.plcPort, this.plcIp, (err) => {
        if (err) { /* ignore send error, rely on timeout */ }
      });

      socket.on('message', () => {
        clearTimeout(timeout);
        socket.close();
        this.isConnected = true;
        this.lastUpdate = new Date();
        resolve(true); // KONEKSI OK
      });
    });
  }

  /**
   * 2. Method Baca Data Sensor (Asli dari Simulator)
   */
  async readSensorData() {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      
      const timeout = setTimeout(() => {
        socket.close();
        this.isConnected = false;
        reject(new Error('PLC Timeout'));
      }, 2000);

      // FINS Command: Read 4 Words start from D100
      const command = Buffer.from([
        0x80, 0x00, 0x02,
        0x00, 0x00, 0x00,
        0x00, 0x00, 0x00,
        0x01,                   
        0x01, 0x01,             // Read
        0x82, 0x00, 0x64, 0x00, // D100
        0x00, 0x04              // 4 Words
      ]);

      socket.send(command, 0, command.length, this.plcPort, this.plcIp, (err) => {
        if (err) reject(err);
      });

      socket.on('message', (msg) => {
        clearTimeout(timeout);
        socket.close();
        this.isConnected = true;

        // Parsing Data dari Simulator
        // Kita ambil 8 byte terakhir (karena kita minta 4 words = 8 bytes)
        // Simulator mengirim Header + Data
        if (msg.length < 8) return;

        const dataOffset = msg.length - 8;
        
        try {
          const counterInput = msg.readUInt16BE(dataOffset);
          const counterOutput = msg.readUInt16BE(dataOffset + 2);
          const statusInput = msg.readUInt16BE(dataOffset + 4);
          const statusOutput = msg.readUInt16BE(dataOffset + 6);

          resolve({
            counterInput,
            counterOutput,
            statusInput,
            statusOutput,
            timestamp: new Date()
          });
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      plcIp: this.plcIp,
      plcPort: this.plcPort,
      lastUpdate: this.lastUpdate,
      mode: 'UDP_REALTIME' // Mode asli
    };
  }

  disconnect() {
    this.isConnected = false;
  }
}

module.exports = new FinsService();
