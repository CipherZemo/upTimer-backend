const axios = require('axios');

/**
 * Perform HTTP health check on a URL
 * @param {Object} check - Check configuration
 * @returns {Object} - { status, responseTime, statusCode, error }
 */
const performHealthCheck = async (check) => {
  const startTime = Date.now();
  
  try {
    // Build full URL with protocol
    const url = check.url.startsWith('http') 
      ? check.url 
      : `${check.protocol}://${check.url}`;

    // Make HTTP request
    const response = await axios({
      method: check.method,
      url: url,
      timeout: check.timeout * 1000, // Convert to milliseconds
      validateStatus: () => true, // Don't throw on any status code
      maxRedirects: 5,
      headers: {
        'User-Agent': 'UptimeMonitor/1.0'
      }
    });

    const responseTime = Date.now() - startTime;

    // Check if status code matches expected
    const isSuccess = response.status === check.expectedStatusCode;

    return {
      status: isSuccess ? 'success' : 'failure',
      responseTime,
      statusCode: response.status,
      errorMessage: isSuccess ? null : `Expected status ${check.expectedStatusCode}, got ${response.status}`,
      errorType: isSuccess ? null : 'http',
      responseHeaders: response.headers,
      responseSize: response.headers['content-length'] 
        ? parseInt(response.headers['content-length']) 
        : null
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Categorize error type
    let errorType = 'unknown';
    let errorMessage = error.message;

    if (error.code === 'ECONNREFUSED') {
      errorType = 'network';
      errorMessage = 'Connection refused';
    } else if (error.code === 'ENOTFOUND') {
      errorType = 'dns';
      errorMessage = 'DNS lookup failed';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorType = 'timeout';
      errorMessage = `Request timeout after ${check.timeout}s`;
    } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
      errorType = 'ssl';
      errorMessage = 'SSL/TLS error';
    }

    return {
      status: 'failure',
      responseTime,
      statusCode: null,
      errorMessage,
      errorType,
      responseHeaders: null,
      responseSize: null
    };
  }
};

module.exports = {
  performHealthCheck
};