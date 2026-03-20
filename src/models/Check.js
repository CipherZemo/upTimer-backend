const mongoose = require("mongoose");

const checkSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Please provide a name for this check"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    url: {
      type: String,
      required: [true, "Please provide a URL to monitor"],
      trim: true,
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        "Please provide a valid URL",
      ],
    },

    // Configuration
    protocol: {
      type: String,
      enum: {
        values: ["http", "https"],
        message: "Protocol must be either http or https",
      },
      default: "https",
    },
    method: {
      type: String,
      enum: {
        values: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        message: "Method must be GET, POST, PUT, DELETE, or PATCH",
      },
      default: "GET",
    },
    interval: {
      type: Number,
      enum: {
        values: [1, 5, 15, 30, 60],
        message: "Interval must be 1, 5, 15, 30, or 60 minutes",
      },
      default: 5, // minutes
    },
    timeout: {
      type: Number,
      min: [5, "Timeout must be at least 5 seconds"],
      max: [60, "Timeout cannot exceed 60 seconds"],
      default: 30, // seconds
    },
    expectedStatusCode: {
      type: Number,
      min: [100, "Status code must be between 100-599"],
      max: [599, "Status code must be between 100-599"],
      default: 200,
    },

    // Status & Tracking
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: {
        values: ["up", "down", "paused"],
        message: "Status must be up, down, or paused",
      },
      default: "paused", // Paused until worker picks it up
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    uptime: {
      type: Number,
      min: 0,
      max: 100,
      default: 100, // percentage
    },

    // Organization
    tags: {
      type: [String],
      default: [],
    },

    // Webhook Configuration
    webhookUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, "Webhook URL must be a valid HTTP/HTTPS URL"],
    },
    webhookEnabled: {
      type: Boolean,
      default: false,
    },
    webhookHeaders: {
      type: Map,
      of: String,
      default: new Map(),
    },

    // Ownership
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster queries
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// Compound index for user-specific queries
checkSchema.index({ userId: 1, createdAt: -1 });

// Index for filtering by status
checkSchema.index({ status: 1 });

// Prevent duplicate URLs for the same user
checkSchema.index({ userId: 1, url: 1 }, { unique: true });

module.exports = mongoose.model("Check", checkSchema);
