const config = require('./environment');

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
