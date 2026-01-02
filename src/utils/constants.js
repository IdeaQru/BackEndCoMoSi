module.exports = {
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
