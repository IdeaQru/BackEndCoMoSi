const app = require('./src/app');
const { createServer } = require('http');
const socketIO = require('socket.io');
const logger = require('./src/utils/logger');
const PlcIntegration = require('./src/integration/plcIntegration');

const port = process.env.SERVER_PORT || 3000;
const server = createServer(app);

const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
