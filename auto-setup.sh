#!/bin/bash

# ============================================================
# 🚀 PHOTOSENSOR BACKEND - AUTOMATIC SETUP SCRIPT
# ============================================================
# 
# CARA PAKAI:
# 1. bash auto-setup.sh
# 2. Tunggu sampai selesai
# 3. npm run dev
# 
# ============================================================

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     PHOTOSENSOR BACKEND - AUTO SETUP                  ║"
echo "║     PLC FINS Protocol Monitoring System               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# STEP 1: CREATE PROJECT STRUCTURE
# ============================================================

echo "📁 Creating project structure..."

mkdir -p src/{config,controllers,services,models,routes,middleware,utils,integration}
mkdir -p logs

echo "✓ Directories created"
echo ""

# ============================================================
# STEP 2: CREATE ALL FILES WITH CONTENT
# ============================================================

echo "📝 Creating all files..."
echo ""

# ============================================================
# ROOT FILES
# ============================================================

cat > server.js << 'EOF'
const app = require('./src/app');
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
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('subscribe-sensor-updates', () => {
    socket.join('sensor-updates');
    logger.debug(`Client ${socket.id} subscribed to sensor updates`);
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
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

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
EOF

echo "✓ server.js created"

cat > package.json << 'EOF'
{
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
EOF

echo "✓ package.json created"

cat > .env.example << 'EOF'
SERVER_PORT=3000
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
EOF

echo "✓ .env.example created"

cat > .gitignore << 'EOF'
node_modules/
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
EOF

echo "✓ .gitignore created"

# ============================================================
# CONFIG FILES
# ============================================================

cat > src/config/environment.js << 'EOF'
require('dotenv').config();

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
EOF

echo "✓ src/config/environment.js created"

cat > src/config/database.js << 'EOF'
const { Pool } = require('pg');
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

pool.on('connect', () => {
  logger.info('Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('Database pool error:', err);
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection failed:', err);
  } else {
    logger.info('Database connection verified');
  }
});

module.exports = pool;
EOF

echo "✓ src/config/database.js created"

cat > src/config/fins.js << 'EOF'
const config = require('./environment');
const logger = require('../utils/logger');

const finsConfig = {
  host: config.PLC.IP,
  port: config.PLC.PORT,
  timeout: config.PLC.TIMEOUT,
  retries: config.PLC.RETRY_ATTEMPTS,
  retryDelay: config.PLC.RETRY_DELAY,
  
  srcNode: 0,
  dstNode: 1,
  srcService: 0,
  dstService: 0,
  
  MEMORY_AREAS: {
    COUNTER_INPUT: 'D100',
    COUNTER_OUTPUT: 'D101',
    STATUS_INPUT: 'D102',
    STATUS_OUTPUT: 'D103'
  },
  
  INPUTS: {
    PHOTO_INPUT: 0,
    PHOTO_OUTPUT: 1
  }
};

logger.info('FINS configuration loaded:', {
  host: finsConfig.host,
  port: finsConfig.port,
  pollInterval: config.PLC.POLLING_INTERVAL
});

module.exports = finsConfig;
EOF

echo "✓ src/config/fins.js created"

# ============================================================
# UTILS FILES
# ============================================================

cat > src/utils/constants.js << 'EOF'
module.exports = {
  SENSOR_STATUS: {
    NO_OBJECT: 0,
    OBJECT_DETECTED: 1
  },
  
  EVENT_TYPE: {
    DETECTED: 'detected',
    CLEARED: 'cleared',
    ERROR: 'error'
  },
  
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  
  ERRORS: {
    PLC_CONNECTION_FAILED: 'PLC connection failed',
    DATABASE_ERROR: 'Database operation failed',
    INVALID_REQUEST: 'Invalid request parameters',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    SERVER_ERROR: 'Internal server error'
  },
  
  SUCCESS: {
    DATA_RETRIEVED: 'Data retrieved successfully',
    DATA_CREATED: 'Data created successfully',
    DATA_UPDATED: 'Data updated successfully',
    DATA_DELETED: 'Data deleted successfully'
  }
};
EOF

echo "✓ src/utils/constants.js created"

cat > src/utils/helpers.js << 'EOF'
const logger = require('./logger');

class Helpers {
  static formatResponse(success, data, message, statusCode = 200) {
    return {
      success,
      statusCode,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }

  static formatError(message, statusCode = 500, error = null) {
    return {
      success: false,
      statusCode,
      message,
      error: error ? error.message : null,
      timestamp: new Date().toISOString()
    };
  }

  static formatSensorStatus(statusValue) {
    return statusValue === 1 ? 'DETECTED' : 'NO_OBJECT';
  }

  static parseFinsResponse(data) {
    try {
      if (Array.isArray(data)) {
        return {
          counterInput: data[0] || 0,
          counterOutput: data[1] || 0,
          statusInput: data[2] || 0,
          statusOutput: data[3] || 0,
          timestamp: new Date()
        };
      }
      throw new Error('Invalid FINS data format');
    } catch (error) {
      logger.error('Error parsing FINS response:', error);
      throw error;
    }
  }

  static calculateObjectDifference(counterInput, counterOutput) {
    return Math.max(0, counterInput - counterOutput);
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        logger.warn(`Attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

module.exports = Helpers;
EOF

echo "✓ src/utils/helpers.js created"

cat > src/utils/logger.js << 'EOF'
const winston = require('winston');
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
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'photosensor-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(config.LOG.DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(config.LOG.DIR, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level}]: ${message}`;
      })
    )
  }));
}

module.exports = logger;
EOF

echo "✓ src/utils/logger.js created"

# ============================================================
# MIDDLEWARE FILES
# ============================================================

cat > src/middleware/logger.js << 'EOF'
const logger = require('../utils/logger');

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    return originalJson.call(this, data);
  };

  next();
};

module.exports = loggerMiddleware;
EOF

echo "✓ src/middleware/logger.js created"

cat > src/middleware/errorHandler.js << 'EOF'
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR;
  let message = err.message || 'Internal server error';

  res.status(statusCode).json(
    Helpers.formatError(message, statusCode, err)
  );
};

module.exports = errorHandler;
EOF

echo "✓ src/middleware/errorHandler.js created"

cat > src/middleware/authMiddleware.js << 'EOF'
const logger = require('../utils/logger');

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(detail => detail.message);
        return res.status(400).json({ success: false, errors: messages });
      }
      req.validatedBody = value;
      next();
    } catch (err) {
      logger.error('Validation error:', err);
      res.status(500).json({ success: false, message: 'Validation error' });
    }
  };
};

module.exports = { validateRequest };
EOF

echo "✓ src/middleware/authMiddleware.js created"

# ============================================================
# APP.JS
# ============================================================

cat > src/app.js << 'EOF'
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const loggerMiddleware = require('./middleware/logger');
const routes = require('./routes');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

app.use(errorHandler);

logger.info('Express app initialized');

module.exports = app;
EOF

echo "✓ src/app.js created"

# ============================================================
# PRINT INSTRUCTIONS
# ============================================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║           ⚠️  LANJUTAN SETUP DI BAWAH ⬇️               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "⏭️  KARENA FILE TERLALU BANYAK, ada 2 PILIHAN:"
echo ""
echo "OPSI A: Copy file dari backend-files-part1.js, part2.js, services.js"
echo "        ke folder yang sudah dibuat (manual, tapi cepat)"
echo ""
echo "OPSI B: Jalankan command berikut untuk download files:"
echo ""
echo "        # 1. Download file generator"
echo "        wget https://[url-ke-files] -O remaining-files.sh"
echo ""
echo "        # 2. Run generator"
echo "        bash remaining-files.sh"
echo ""
echo "        # 3. Install & setup"
echo "        npm install"
echo "        createdb photosensor_db"
echo "        psql -U postgres -d photosensor_db -f database.sql"
echo "        cp .env.example .env"
echo "        npm run dev"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""
echo "✅ Sekarang Anda punya:"
echo "   ✓ Folder structure lengkap"
echo "   ✓ Root files (server.js, package.json, etc)"
echo "   ✓ Config files (environment, database, fins)"
echo "   ✓ Utils & Middleware"
echo ""
echo "📝 LANGKAH SELANJUTNYA:"
echo "   1. Copy remaining files dari backend-files-*.js"
echo "   2. Run: npm install"
echo "   3. Run: createdb photosensor_db"
echo "   4. Run: psql -U postgres -d photosensor_db -f database.sql"
echo "   5. Run: cp .env.example .env"
echo "   6. Edit .env dengan PLC_IP Anda"
echo "   7. Run: npm run dev"
echo ""
echo "═══════════════════════════════════════════════════════════"

EOF

echo "✓ auto-setup.sh created"
chmod +x auto-setup.sh

echo ""
echo "✅ Setup script created successfully!"
echo ""
