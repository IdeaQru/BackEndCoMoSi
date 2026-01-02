/**
 * ============================================================
 * 🚀 PHOTOSENSOR BACKEND - AUTOMATIC SETUP (Node.js)
 * ============================================================
 * 
 * CARA PAKAI (Windows, Mac, Linux):
 * 
 * 1. node setup.js
 * 2. npm install
 * 3. createdb photosensor_db
 * 4. psql -U postgres -d photosensor_db -f database.sql
 * 5. cp .env.example .env (edit PLC_IP)
 * 6. npm run dev
 * 
 * SELESAI! Backend running! 🎉
 * 
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     PHOTOSENSOR BACKEND - AUTO SETUP                  ║');
console.log('║     PLC FINS Protocol Monitoring System               ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// ============================================================
// STEP 1: CREATE DIRECTORIES
// ============================================================

console.log('📁 Creating project structure...');

const dirs = [
  'src',
  'src/config',
  'src/controllers',
  'src/services',
  'src/models',
  'src/routes',
  'src/middleware',
  'src/utils',
  'src/integration',
  'logs'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`  ✓ ${dir}/`);
  }
});

console.log('✓ Directories created\n');

// ============================================================
// HELPER FUNCTION
// ============================================================

function createFile(filePath, content) {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ ${filePath} created`);
}

// ============================================================
// STEP 2: CREATE FILES
// ============================================================

console.log('📝 Creating all files...\n');

// ============================================================
// server.js
// ============================================================

createFile('server.js', `const app = require('./src/app');
const { createServer } = require('http');
const socketIO = require('socket.io');
const logger = require('./src/utils/logger');
const PlcIntegration = require('./src/integration/plcIntegration');

const port = process.env.SERVER_PORT || 3000;
const server = createServer(app);

const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  logger.info(\`Client connected: \${socket.id}\`);

  socket.on('disconnect', () => {
    logger.info(\`Client disconnected: \${socket.id}\`);
  });

  socket.on('subscribe-sensor-updates', () => {
    socket.join('sensor-updates');
    logger.debug(\`Client \${socket.id} subscribed to sensor updates\`);
  });

  socket.on('request-current-status', (callback) => {
    try {
      const finsService = require('./src/services/finsService');
      const status = finsService.getStatus();
      callback({ success: true, data: status });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });
});

server.listen(port, async () => {
  logger.info(\`Server running on port \${port}\`);
  logger.info(\`Environment: \${process.env.NODE_ENV}\`);

  try {
    await PlcIntegration.initialize(io);
  } catch (error) {
    logger.error('Failed to initialize PLC integration:', error);
    logger.warn('Server will continue but PLC monitoring may not work');
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  PlcIntegration.shutdown();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  PlcIntegration.shutdown();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
`);

// ============================================================
// package.json
// ============================================================

createFile('package.json', `{
  "name": "photosensor-backend",
  "version": "1.0.0",
  "description": "PLC FINS Protocol backend untuk monitoring photosensor",
  "main": "server.js",
  "scripts": {
    "start": "NODE_ENV=production node server.js",
    "dev": "NODE_ENV=development nodemon server.js",
    "debug": "DEBUG=* nodemon server.js",
    "lint": "eslint src/",
    "test": "jest"
  },
  "keywords": ["PLC", "FINS", "Omron", "Photosensor", "SCADA"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "pg": "^8.8.0",
    "socket.io": "^4.5.4",
    "axios": "^1.3.2",
    "winston": "^3.8.2",
    "omron-fins": "^1.1.0",
    "joi": "^17.7.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "eslint": "^8.33.0",
    "jest": "^29.3.1",
    "supertest": "^6.3.3"
  }
}
`);

// ============================================================
// .env.example
// ============================================================

createFile('.env.example', `SERVER_PORT=3000
NODE_ENV=development

PLC_IP=192.168.1.100
PLC_PORT=9600
PLC_POLLING_INTERVAL=200

DB_HOST=localhost
DB_PORT=5432
DB_NAME=photosensor_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

API_PREFIX=/api
API_VERSION=v1

CORS_ORIGIN=http://localhost:4200

LOG_LEVEL=debug
LOG_DIR=./logs
`);

// ============================================================
// .gitignore
// ============================================================

createFile('.gitignore', `node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

.env
.env.local
.env.*.local

.vscode/
.idea/
*.swp
*.swo
*~

logs/
*.log

dist/
build/

.cache/
.parcel-cache
.next
coverage/

Thumbs.db
.DS_Store
`);

// ============================================================
// CONFIG FILES
// ============================================================

createFile('src/config/environment.js', `require('dotenv').config();

module.exports = {
  SERVER_PORT: process.env.SERVER_PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  PLC: {
    IP: process.env.PLC_IP || '192.168.1.100',
    PORT: parseInt(process.env.PLC_PORT) || 9600,
    POLLING_INTERVAL: parseInt(process.env.PLC_POLLING_INTERVAL) || 200,
    TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },
  
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT) || 5432,
    NAME: process.env.DB_NAME || 'photosensor_db',
    USER: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || 'password',
    POOL_MAX: 20,
    POOL_IDLE_TIMEOUT: 30000,
    POOL_CONNECTION_TIMEOUT: 2000
  },
  
  API: {
    PREFIX: process.env.API_PREFIX || '/api',
    VERSION: process.env.API_VERSION || 'v1'
  },
  
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200'
  },
  
  LOG: {
    LEVEL: process.env.LOG_LEVEL || 'debug',
    DIR: './logs'
  }
};
`);

createFile('src/config/database.js', `const { Pool } = require('pg');
const config = require('./environment');
const logger = require('../utils/logger');

const pool = new Pool({
  user: config.DATABASE.USER,
  password: config.DATABASE.PASSWORD,
  host: config.DATABASE.HOST,
  port: config.DATABASE.PORT,
  database: config.DATABASE.NAME,
  max: config.DATABASE.POOL_MAX,
  idleTimeoutMillis: config.DATABASE.POOL_IDLE_TIMEOUT,
  connectionTimeoutMillis: config.DATABASE.POOL_CONNECTION_TIMEOUT
});

pool.on('error', (err) => {
  logger.error('Database pool error:', err);
});

module.exports = pool;
`);

createFile('src/config/fins.js', `const config = require('./environment');

const finsConfig = {
  host: config.PLC.IP,
  port: config.PLC.PORT,
  timeout: config.PLC.TIMEOUT,
  retries: config.PLC.RETRY_ATTEMPTS,
  retryDelay: config.PLC.RETRY_DELAY,
  
  srcNode: 0,
  dstNode: 1,
  srcService: 0,
  dstService: 0
};

module.exports = finsConfig;
`);

// ============================================================
// UTILS FILES
// ============================================================

createFile('src/utils/constants.js', `module.exports = {
  SENSOR_STATUS: { NO_OBJECT: 0, OBJECT_DETECTED: 1 },
  EVENT_TYPE: { DETECTED: 'detected', CLEARED: 'cleared', ERROR: 'error' },
  HTTP_STATUS: {
    OK: 200, CREATED: 201, BAD_REQUEST: 400,
    UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
    INTERNAL_ERROR: 500, SERVICE_UNAVAILABLE: 503
  },
  ERRORS: {
    PLC_CONNECTION_FAILED: 'PLC connection failed',
    DATABASE_ERROR: 'Database operation failed',
    INVALID_REQUEST: 'Invalid request parameters',
    SERVER_ERROR: 'Internal server error'
  },
  SUCCESS: {
    DATA_RETRIEVED: 'Data retrieved successfully',
    DATA_CREATED: 'Data created successfully'
  }
};
`);

createFile('src/utils/helpers.js', `module.exports = {
  formatResponse: (success, data, message, statusCode = 200) => ({
    success, statusCode, data, message, timestamp: new Date().toISOString()
  }),
  
  formatError: (message, statusCode = 500, error = null) => ({
    success: false, statusCode, message,
    error: error ? error.message : null,
    timestamp: new Date().toISOString()
  }),
  
  parseFinsResponse: (data) => ({
    counterInput: data[0] || 0,
    counterOutput: data[1] || 0,
    statusInput: data[2] || 0,
    statusOutput: data[3] || 0,
    timestamp: new Date()
  }),
  
  calculateObjectDifference: (counterInput, counterOutput) =>
    Math.max(0, counterInput - counterOutput)
};
`);

createFile('src/utils/logger.js', `const winston = require('winston');
const path = require('path');
const config = require('../config/environment');
const fs = require('fs');

if (!fs.existsSync(config.LOG.DIR)) {
  fs.mkdirSync(config.LOG.DIR, { recursive: true });
}

const logger = winston.createLogger({
  level: config.LOG.LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'photosensor-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(config.LOG.DIR, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(config.LOG.DIR, 'combined.log')
    })
  ]
});

if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp }) =>
        \`\${timestamp} [\${level}]: \${message}\`
      )
    )
  }));
}

module.exports = logger;
`);

// ============================================================
// MIDDLEWARE FILES
// ============================================================

createFile('src/middleware/logger.js', `const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    logger.info({
      method: req.method, path: req.path,
      statusCode: res.statusCode, duration: \`\${duration}ms\`
    });
    return originalJson.call(this, data);
  };
  next();
};
`);

createFile('src/middleware/errorHandler.js', `const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

module.exports = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path });
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(
    Helpers.formatError(err.message || 'Server error', statusCode, err)
  );
};
`);

createFile('src/middleware/authMiddleware.js', `module.exports = { validateRequest: () => (req, res, next) => next() };
`);

// ============================================================
// APP.JS
// ============================================================

createFile('src/app.js', `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const loggerMiddleware = require('./middleware/logger');
const routes = require('./routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use(\`/api/\${process.env.API_VERSION || 'v1'}\`, routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

logger.info('Express app initialized');

module.exports = app;
`);

// ============================================================
// PRINT INSTRUCTIONS
// ============================================================

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║              ✅ SETUP PART 1 COMPLETE!                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('✅ Created:');
console.log('   ✓ Folder structure (src, config, services, etc)');
console.log('   ✓ Root files (server.js, package.json, .env.example)');
console.log('   ✓ Config files');
console.log('   ✓ Utils & Middleware\n');

console.log('═══════════════════════════════════════════════════════════\n');
console.log('⏭️  LANGKAH SELANJUTNYA:\n');

console.log('1️⃣  INSTALL DEPENDENCIES:');
console.log('   npm install\n');

console.log('2️⃣  COPY REMAINING FILES:');
console.log('   Copy dari backend-files-part1.js, services.js, part2.js');
console.log('   ke folder src/ yang sudah dibuat\n');

console.log('   File yang perlu di-copy:');
console.log('   - src/services/* (5 files)');
console.log('   - src/integration/* (1 file)');
console.log('   - src/controllers/* (2 files)');
console.log('   - src/models/* (3 files)');
console.log('   - src/routes/* (3 files)');
console.log('   - database.sql\n');

console.log('3️⃣  SETUP DATABASE:');
console.log('   createdb photosensor_db');
console.log('   psql -U postgres -d photosensor_db -f database.sql\n');

console.log('4️⃣  CONFIGURE:');
console.log('   cp .env.example .env');
console.log('   nano .env  (edit PLC_IP & DB_PASSWORD)\n');

console.log('5️⃣  RUN:');
console.log('   npm run dev\n');

console.log('═══════════════════════════════════════════════════════════\n');

console.log('🎯 STRUKTUR FOLDER SUDAH SIAP:\n');
console.log('photosensor-backend/');
console.log('├── server.js ✅');
console.log('├── package.json ✅');
console.log('├── .env.example ✅');
console.log('├── .gitignore ✅');
console.log('├── src/');
console.log('│   ├── app.js ✅');
console.log('│   ├── config/ (3 files) ✅');
console.log('│   ├── utils/ (3 files) ✅');
console.log('│   ├── middleware/ (3 files) ✅');
console.log('│   ├── services/ (5 files) ⏳ TO DO');
console.log('│   ├── integration/ (1 file) ⏳ TO DO');
console.log('│   ├── controllers/ (2 files) ⏳ TO DO');
console.log('│   ├── models/ (3 files) ⏳ TO DO');
console.log('│   └── routes/ (3 files) ⏳ TO DO');
console.log('└── logs/ ✅\n');

console.log('═══════════════════════════════════════════════════════════');

module.exports = { status: 'success', message: 'Setup part 1 complete' };
