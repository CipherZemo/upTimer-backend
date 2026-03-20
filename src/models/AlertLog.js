const mongoose = require("mongoose");

const alertLogSchema = new mongoose.Schema(
  {
    // References
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
      index: true,
    },
    checkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Check",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Alert details
    type: {
      type: String,
      enum: ["email", "webhook", "sms"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["down", "recovery", "slow"],
      required: true,
    },

    // Delivery info
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
    recipient: {
      type: String, // Email address or webhook URL
      required: true,
    },
    errorMessage: {
      type: String,
    },

    // Metadata
    responseTime: {
      type: Number, // milliseconds
    },
    statusCode: {
      type: Number, // HTTP status for webhooks
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
alertLogSchema.index({ userId: 1, sentAt: -1 });
alertLogSchema.index({ checkId: 1, sentAt: -1 });
alertLogSchema.index({ incidentId: 1 });

// TTL index to auto-delete logs older than 90 days
alertLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("AlertLog", alertLogSchema);
