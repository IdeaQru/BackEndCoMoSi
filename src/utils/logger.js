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
        `${timestamp} [${level}]: ${message}`
      )
    )
  }));
}

module.exports = logger;
