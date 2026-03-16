// Subscription tier limits
const TIER_LIMITS = {
  free: {
    maxChecks: 5,
    minInterval: 5, // minutes
    name: 'Free'
  },
  pro: {
    maxChecks: 50,
    minInterval: 1, // minutes
    name: 'Pro'
  },
  enterprise: {
    maxChecks: Infinity,
    minInterval: 1, // minutes
    name: 'Enterprise'
  }
};

/**
 * Get limit for a specific subscription tier
 * @param {String} tier - Subscription tier (free, pro, enterprise)
 * @returns {Object} Tier limits
 */
const getTierLimit = (tier) => {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
};

/**
 * Check if user can create more checks
 * @param {Number} currentCheckCount - User's current check count
 * @param {String} tier - User's subscription tier
 * @returns {Object} { allowed: Boolean, limit: Number, message: String }
 */
const canCreateCheck = (currentCheckCount, tier) => {
  const limit = getTierLimit(tier);
  
  if (currentCheckCount >= limit.maxChecks) {
    return {
      allowed: false,
      limit: limit.maxChecks,
      message: `Check limit reached. ${limit.name} tier allows ${limit.maxChecks} checks. ${
        tier === 'free' ? 'Upgrade to Pro for 50 checks.' : 'Contact support for higher limits.'
      }`
    };
  }

  return {
    allowed: true,
    limit: limit.maxChecks,
    remaining: limit.maxChecks - currentCheckCount
  };
};

/**
 * Check if interval is allowed for tier
 * @param {Number} interval - Check interval in minutes
 * @param {String} tier - User's subscription tier
 * @returns {Object} { allowed: Boolean, minInterval: Number, message: String }
 */
const isIntervalAllowed = (interval, tier) => {
  const limit = getTierLimit(tier);
  
  if (interval < limit.minInterval) {
    return {
      allowed: false,
      minInterval: limit.minInterval,
      message: `Minimum interval for ${limit.name} tier is ${limit.minInterval} minute(s). Upgrade for faster checks.`
    };
  }

  return {
    allowed: true,
    minInterval: limit.minInterval
  };
};

module.exports = {
  TIER_LIMITS,
  getTierLimit,
  canCreateCheck,
  isIntervalAllowed
};