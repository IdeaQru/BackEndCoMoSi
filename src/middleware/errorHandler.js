const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

module.exports = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path });
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(
    Helpers.formatError(err.message || 'Server error', statusCode, err)
  );
};
