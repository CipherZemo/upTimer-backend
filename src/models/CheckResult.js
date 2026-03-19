const mongoose = require('mongoose');

const checkResultSchema = new mongoose.Schema(
  {
    // Reference to the check
    checkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Check',
      required: true,
      index: true
    },

    // Check result
    status: {
      type: String,
      enum: ['success', 'failure'],
      required: true
    },
    responseTime: {
      type: Number, // milliseconds
      required: true
    },
    statusCode: {
      type: Number,
      min: 100,
      max: 599
    },
    errorMessage: {
      type: String
    },
    errorType: {
      type: String,
      enum: ['timeout', 'dns', 'ssl', 'http', 'network', 'unknown']
    },

    // Metadata
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    checkedAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    // Response details (optional)
    responseHeaders: {
      type: Object
    },
    responseSize: {
      type: Number // bytes
    }
  },
  {
    timestamps: false // We're managing timestamp manually
  }
);

// Compound index for efficient queries
checkResultSchema.index({ checkId: 1, timestamp: -1 });

// TTL index to auto-delete results older than 30 days
checkResultSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('CheckResult', checkResultSchema);