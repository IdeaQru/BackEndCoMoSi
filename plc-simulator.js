/*
 * PLC OMRON FINS SIMULATOR (Node.js)
 * - UDP Port 9600
 * - Supports:
 *   - 0101: Memory Area Read (DM / 0x82)
 *   - 0102: Memory Area Write (DM / 0x82)  (optional, for reset/write testing)
 * - Simulated DM words: D100..D103
 * - Internal update rate: 2 Hz (500ms)
 */

const dgram = require('dgram');
const server = dgram.createSocket({ type: 'udp4', reuseAddr: true });

const SIMULATOR_PORT = 9600;
const UPDATE_INTERVAL_MS = 500;

// ===== Simulated DM memory (word-based) =====
const DM_BASE = 0x0000; // DM D00000 => address 0x0000
let memory = {
  D100: 150,
  D101: 140,
  D102: 0,
  D103: 0,
};

// Internal update loop (2 Hz)
setInterval(() => {
  if (Math.random() > 0.5) memory.D100++;
  if (Math.random() > 0.6) memory.D101++;

  memory.D102 = Math.random() > 0.7 ? 1 : 0;
  memory.D103 = Math.random() > 0.7 ? 1 : 0;
}, UPDATE_INTERVAL_MS);

// Helpers
function toUInt16BE(buf, offset) {
  if (offset + 2 > buf.length) return 0;
  return buf.readUInt16BE(offset);
}

function writeUInt16BE(buf, offset, value) {
  buf.writeUInt16BE(value & 0xffff, offset);
}

function dmReadWord(wordAddr) {
  // wordAddr is DM word address (0 = D00000)
  // We only map D100..D103 for now
  if (wordAddr === 0x0064) return memory.D100; // 100
  if (wordAddr === 0x0065) return memory.D101; // 101
  if (wordAddr === 0x0066) return memory.D102; // 102
  if (wordAddr === 0x0067) return memory.D103; // 103
  return 0;
}

function dmWriteWord(wordAddr, value) {
  if (wordAddr === 0x0064) memory.D100 = value;
  if (wordAddr === 0x0065) memory.D101 = value;
  if (wordAddr === 0x0066) memory.D102 = value;
  if (wordAddr === 0x0067) memory.D103 = value;
}

function buildFinsResponseHeader(req) {
  // FINS header layout (indexes):
  // 0 ICF,1 RSV,2 GCT,3 DNA,4 DA1,5 DA2,6 SNA,7 SA1,8 SA2,9 SID,10 MRC,11 SRC, ...
  const ICF_RES = 0xC0; // typical response ICF
  const RSV = 0x00;
  const GCT = req[2] ?? 0x02;

  const reqDNA = req[3] ?? 0x00;
  const reqDA1 = req[4] ?? 0x00;
  const reqDA2 = req[5] ?? 0x00;
  const reqSNA = req[6] ?? 0x00;
  const reqSA1 = req[7] ?? 0x00;
  const reqSA2 = req[8] ?? 0x00;
  const SID = req[9] ?? 0x00;

  const MRC = req[10] ?? 0x00;
  const SRC = req[11] ?? 0x00;

  // IMPORTANT:
  // Response destination should be request source (SNA/SA1/SA2)
  // Response source should be request destination (DNA/DA1/DA2)
  return Buffer.from([
    ICF_RES, RSV, GCT,
    reqSNA, reqSA1, reqSA2, // DNA, DA1, DA2 (dest = req source)
    reqDNA, reqDA1, reqDA2, // SNA, SA1, SA2 (src = req dest)
    SID,
    MRC, SRC
  ]);
}

function buildEndCode(ok = true) {
  return ok ? Buffer.from([0x00, 0x00]) : Buffer.from([0x00, 0x01]); // simple error
}

server.on('error', (err) => {
  console.error(`❌ UDP Server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  try {
    // Minimal sanity check
    if (!Buffer.isBuffer(msg) || msg.length < 12) {
      return;
    }

    const mrc = msg[10];
    const src = msg[11];

    // ===== 0101 Memory Area Read =====
    if (mrc === 0x01 && src === 0x01) {
      // Command format (after 12 bytes header):
      // 12: area code
      // 13-14: beginning address (word) (big endian)
      // 15: bit address
      // 16-17: number of items (words) (big endian)
      const area = msg[12];
      const beginWord = toUInt16BE(msg, 13);
      const bit = msg[15] ?? 0x00;
      const count = toUInt16BE(msg, 16);

      // Only support DM area (0x82) for now
      const ok = (area === 0x82) && (bit === 0x00) && count > 0 && count <= 200;

      const header = buildFinsResponseHeader(msg);
      const endCode = buildEndCode(ok);

      if (!ok) {
        const response = Buffer.concat([header, endCode]);
        server.send(response, rinfo.port, rinfo.address);
        return;
      }

      const data = Buffer.alloc(count * 2);
      for (let i = 0; i < count; i++) {
        const wordAddr = beginWord + i;
        const value = dmReadWord(wordAddr);
        writeUInt16BE(data, i * 2, value);
      }

      const response = Buffer.concat([header, endCode, data]);
      server.send(response, rinfo.port, rinfo.address, (err) => {
        if (!err) {
          process.stdout.write(
            `\r📤 0101 -> ${rinfo.address}:${rinfo.port} | D100=${memory.D100} D101=${memory.D101} D102=${memory.D102} D103=${memory.D103}     `
          );
        }
      });
      return;
    }

    // ===== 0102 Memory Area Write (optional) =====
    if (mrc === 0x01 && src === 0x02) {
      // Command format:
      // 12: area code
      // 13-14: beginning address (word)
      // 15: bit address
      // 16-17: number of items
      // 18..: write data (count * 2 bytes)
      const area = msg[12];
      const beginWord = toUInt16BE(msg, 13);
      const bit = msg[15] ?? 0x00;
      const count = toUInt16BE(msg, 16);

      const expectedLen = 18 + (count * 2);
      const ok = (area === 0x82) && (bit === 0x00) && count > 0 && msg.length >= expectedLen;

      if (ok) {
        for (let i = 0; i < count; i++) {
          const value = toUInt16BE(msg, 18 + i * 2);
          dmWriteWord(beginWord + i, value);
        }
      }

      const header = buildFinsResponseHeader(msg);
      const endCode = buildEndCode(ok);
      const response = Buffer.concat([header, endCode]);

      server.send(response, rinfo.port, rinfo.address, (err) => {
        if (!err) {
          process.stdout.write(
            `\r📤 0102 -> ${rinfo.address}:${rinfo.port} | WRITE ok=${ok ? 'YES' : 'NO '} | D100=${memory.D100} D101=${memory.D101}     `
          );
        }
      });
      return;
    }

    // Unknown command → respond error (optional)
    const header = buildFinsResponseHeader(msg);
    const endCode = buildEndCode(false);
    const response = Buffer.concat([header, endCode]);
    server.send(response, rinfo.port, rinfo.address);

  } catch (error) {
    console.error('Error processing message:', error);
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`🏭 PLC FINS SIMULATOR listening on ${address.address}:${address.port}`);
  console.log(`⏱️  Internal data updates every ${UPDATE_INTERVAL_MS}ms (2 Hz)`);
  console.log('-----------------------------------------------------------');
});

server.bind(SIMULATOR_PORT, '0.0.0.0');
