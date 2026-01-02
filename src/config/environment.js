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
