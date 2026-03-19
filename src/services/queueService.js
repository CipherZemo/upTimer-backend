const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

// Create queue
const checkQueue = new Queue('checkQueue', { connection });

/**
 * Add a repeatable job for a check
 * @param {Object} check - Check document from MongoDB
 */
const addCheckJob = async (check) => {
  try {
    const jobName = `check-${check._id}`;
    
    // Add repeatable job
    await checkQueue.add(
      jobName,
      { checkId: check._id.toString() },
      {
        repeat: {
          pattern: `*/${check.interval} * * * *`, // Cron pattern for interval in minutes
        },
        jobId: jobName,
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    console.log(`✅ Created job for check: ${check.name} (every ${check.interval} min)`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating job for check ${check.name}:`, error.message);
    throw error;
  }
};

/**
 * Update a repeatable job (remove and recreate)
 * @param {Object} check - Updated check document
 */
const updateCheckJob = async (check) => {
  try {
    await removeCheckJob(check._id);
    await addCheckJob(check);
    console.log(`🔄 Updated job for check: ${check.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating job for check ${check.name}:`, error.message);
    throw error;
  }
};

/**
 * Remove a repeatable job
 * @param {String} checkId - Check ID
 */
const removeCheckJob = async (checkId) => {
  try {
    const jobName = `check-${checkId}`;
    
    // Remove repeatable job
    await checkQueue.removeRepeatable(jobName, {
      pattern: '*'  // Remove all patterns for this job
    });

    console.log(`🗑️  Removed job for check ID: ${checkId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error removing job for check ${checkId}:`, error.message);
    // Don't throw - job might not exist
    return false;
  }
};

/**
 * Pause a check job
 * @param {String} checkId - Check ID
 */
const pauseCheckJob = async (checkId) => {
  try {
    await removeCheckJob(checkId);
    console.log(`⏸️  Paused job for check ID: ${checkId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error pausing job:`, error.message);
    return false;
  }
};

/**
 * Resume a check job
 * @param {Object} check - Check document
 */
const resumeCheckJob = async (check) => {
  try {
    await addCheckJob(check);
    console.log(`▶️  Resumed job for check: ${check.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Error resuming job:`, error.message);
    throw error;
  }
};

/**
 * Get queue stats
 */
const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      checkQueue.getWaitingCount(),
      checkQueue.getActiveCount(),
      checkQueue.getCompletedCount(),
      checkQueue.getFailedCount(),
      checkQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed
    };
  } catch (error) {
    console.error('❌ Error getting queue stats:', error.message);
    return null;
  }
};

module.exports = {
  checkQueue,
  addCheckJob,
  updateCheckJob,
  removeCheckJob,
  pauseCheckJob,
  resumeCheckJob,
  getQueueStats
};