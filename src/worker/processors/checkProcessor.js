const Check = require('../../models/Check');
const CheckResult = require('../../models/CheckResult');
const { performHealthCheck } = require('../services/httpClient');
const { calculateUptime } = require('../services/uptimeCalculator');

/**
 * Process a health check job
 * @param {Object} job - BullMQ job
 */
const processCheck = async (job) => {
  const { checkId } = job.data;
  
  console.log(`\n🔍 Processing check ID: ${checkId}`);

  try {
    // Get check from database
    const check = await Check.findById(checkId);

    if (!check) {
      console.error(`❌ Check not found: ${checkId}`);
      return { success: false, error: 'Check not found' };
    }

    // Skip if check is not active
    if (!check.isActive) {
      console.log(`⏸️  Check paused, skipping: ${check.name}`);
      return { success: true, skipped: true };
    }

    console.log(`📡 Checking: ${check.name} (${check.url})`);

    // Perform health check
    const result = await performHealthCheck(check);

    console.log(`📊 Result: ${result.status} | ${result.responseTime}ms | Status: ${result.statusCode || 'N/A'}`);

    // Save check result
    const checkResult = await CheckResult.create({
      checkId: check._id,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      errorType: result.errorType,
      timestamp: new Date(),
      checkedAt: new Date(),
      responseHeaders: result.responseHeaders,
      responseSize: result.responseSize
    });

    // Update check status
    const previousStatus = check.status;
    const newStatus = result.status === 'success' ? 'up' : 'down';

    // Calculate uptime (last 24 hours)
    const uptime = await calculateUptime(check._id, 24);

    // Update check document
    await Check.findByIdAndUpdate(check._id, {
      status: newStatus,
      lastCheckedAt: new Date(),
      uptime: uptime
    });

    // Log status change
    if (previousStatus !== newStatus) {
      console.log(`🚨 Status changed: ${check.name} is now ${newStatus.toUpperCase()}`);
      // TODO: Trigger alert (Step 5/6)
    }

    console.log(`✅ Check complete: ${check.name} | Uptime: ${uptime}%`);

    return {
      success: true,
      checkId,
      checkName: check.name,
      status: newStatus,
      responseTime: result.responseTime,
      uptime
    };

  } catch (error) {
    console.error(`❌ Error processing check ${checkId}:`, error.message);
    
    // Save failed result
    try {
      await CheckResult.create({
        checkId,
        status: 'failure',
        responseTime: 0,
        errorMessage: error.message,
        errorType: 'unknown',
        timestamp: new Date(),
        checkedAt: new Date()
      });
    } catch (saveError) {
      console.error('❌ Error saving failed result:', saveError.message);
    }

    throw error; // Let BullMQ handle retry
  }
};

module.exports = {
  processCheck
};