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

pool.on('error', (err) => {
  logger.error('Database pool error:', err);
});

module.exports = pool;
