const CheckResult = require('../../models/CheckResult');

/**
 * Calculate uptime percentage based on recent check results
 * @param {String} checkId - Check ID
 * @param {Number} hours - Number of hours to look back (default: 24)
 * @returns {Number} - Uptime percentage (0-100)
 */
const calculateUptime = async (checkId, hours = 24) => {
  try {
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get all results in the time period
    const results = await CheckResult.find({
      checkId,
      timestamp: { $gte: sinceTime }
    }).sort({ timestamp: -1 });

    if (results.length === 0) {
      return 100; // No data = assume up
    }

    // Count successful checks
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;

    // Calculate percentage
    const uptime = (successCount / totalCount) * 100;

    return Math.round(uptime * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating uptime:', error.message);
    return 100; // Default to 100 on error
  }
};

/**
 * Calculate average response time
 * @param {String} checkId - Check ID
 * @param {Number} hours - Number of hours to look back
 * @returns {Number} - Average response time in ms
 */
const calculateAverageResponseTime = async (checkId, hours = 24) => {
  try {
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const results = await CheckResult.find({
      checkId,
      timestamp: { $gte: sinceTime },
      status: 'success' // Only successful checks
    });

    if (results.length === 0) {
      return 0;
    }

    const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0);
    const avgResponseTime = totalResponseTime / results.length;

    return Math.round(avgResponseTime);
  } catch (error) {
    console.error('Error calculating average response time:', error.message);
    return 0;
  }
};

module.exports = {
  calculateUptime,
  calculateAverageResponseTime
};