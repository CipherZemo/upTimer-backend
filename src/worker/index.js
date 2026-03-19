require('dotenv').config();
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const express = require('express');
const connectDB = require('../config/db');
const Check = require('../models/Check');
const { processCheck } = require('./processors/checkProcessor');
const { addCheckJob } = require('../services/queueService');

// Connect to MongoDB
connectDB();

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

// Task 22: Create worker with concurrency control
const worker = new Worker(
  'checkQueue',
  async (job) => {
    return await processCheck(job);
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 10,
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000 // per 60 seconds
    }
  }
);

// Worker event listeners
worker.on('completed', (job, result) => {
  if (!result.skipped) {
    console.log(`✅ Job completed: ${job.name}`);
  }
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job.name} - ${err.message}`);
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

// Task 15: Initialize jobs for existing checks on startup
const initializeJobs = async () => {
  try {
    console.log('\n🔄 Initializing jobs for existing checks...');

    // Get all active checks
    const activeChecks = await Check.find({ isActive: true });

    console.log(`📊 Found ${activeChecks.length} active checks`);

    // Create jobs for each check
    for (const check of activeChecks) {
      try {
        await addCheckJob(check);
      } catch (error) {
        console.error(`❌ Error creating job for check ${check.name}:`, error.message);
      }
    }

    console.log('✅ Job initialization complete\n');
  } catch (error) {
    console.error('❌ Error initializing jobs:', error.message);
  }
};

// Task 20: Health check server
const app = express();

app.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    const redisPing = await connection.ping();
    
    // Check worker status
    const isRunning = !worker.isPaused();

    res.status(200).json({
      status: 'ok',
      worker: {
        running: isRunning,
        concurrency: worker.opts.concurrency
      },
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

const WORKER_PORT = process.env.WORKER_PORT || 3001;
app.listen(WORKER_PORT, () => {
  console.log(`🏥 Worker health server running on port ${WORKER_PORT}`);
});

// Task 21: Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, closing worker gracefully...`);
  
  try {
    await worker.close();
    await connection.quit();
    console.log('✅ Worker closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start worker
console.log('🔄 Worker started, processing checks...');
console.log(`⚙️  Concurrency: ${worker.opts.concurrency}`);

// Initialize jobs after a short delay (let DB connect)
setTimeout(initializeJobs, 2000);