module.exports = {
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
