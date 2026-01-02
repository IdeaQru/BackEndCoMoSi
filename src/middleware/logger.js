const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    logger.info({
      method: req.method, path: req.path,
      statusCode: res.statusCode, duration: `${duration}ms`
    });
    return originalJson.call(this, data);
  };
  next();
};
