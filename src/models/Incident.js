const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    // Reference to the check
    checkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Check',
      required: true,
      index: true
    },

    // Reference to the user (for notifications)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Incident details
    status: {
      type: String,
      enum: ['open', 'resolved', 'acknowledged'],
      default: 'open',
      index: true
    },

    // Timestamps
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    resolvedAt: {
      type: Date,
      default: null
    },

    // Duration in minutes
    duration: {
      type: Number,
      default: null
    },

    // Acknowledgment
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: {
      type: Date
    },

    // Failure details
    failureReason: {
      type: String
    },
    errorType: {
      type: String,
      enum: ['timeout', 'dns', 'ssl', 'http', 'network', 'unknown']
    },

    // Notification tracking
    downAlertSent: {
      type: Boolean,
      default: false
    },
    recoveryAlertSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user-specific queries
incidentSchema.index({ userId: 1, status: 1, startedAt: -1 });

// Method to resolve incident
incidentSchema.methods.resolve = function() {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  
  // Calculate duration in minutes
  const durationMs = this.resolvedAt - this.startedAt;
  this.duration = Math.round(durationMs / 60000);
  
  return this.save();
};

module.exports = mongoose.model('Incident', incidentSchema);