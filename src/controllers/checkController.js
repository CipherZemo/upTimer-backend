const Check = require('../models/Check');
const ErrorResponse = require('../utils/errorResponse');
const { canCreateCheck, isIntervalAllowed } = require('../utils/checkLimits');

// @desc    Create new check
// @route   POST /api/checks
// @access  Private
exports.createCheck = async (req, res, next) => {
  try {
    const { name, url, protocol, method, interval, timeout, expectedStatusCode, tags } = req.body;
    const userId = req.user.id;
    const userTier = req.user.subscriptionTier;

    // Task 11: Check subscription tier limits
    const currentCheckCount = await Check.countDocuments({ userId });
    const limitCheck = canCreateCheck(currentCheckCount, userTier);

    if (!limitCheck.allowed) {
      return next(new ErrorResponse(limitCheck.message, 403));
    }

    // Task 11: Check if interval is allowed for tier
    if (interval) {
      const intervalCheck = isIntervalAllowed(interval, userTier);
      if (!intervalCheck.allowed) {
        return next(new ErrorResponse(intervalCheck.message, 403));
      }
    }

    // Task 12: Check for duplicate URL
    const existingCheck = await Check.findOne({ userId, url });
    if (existingCheck) {
      return next(new ErrorResponse('You are already monitoring this URL', 400));
    }

    // Create check
    const check = await Check.create({
      name,
      url,
      protocol,
      method,
      interval,
      timeout,
      expectedStatusCode,
      tags,
      userId
    });

    res.status(201).json({
      success: true,
      check
    });
  } catch (error) {
    // Handle duplicate key error (MongoDB unique index)
    if (error.code === 11000) {
      return next(new ErrorResponse('You are already monitoring this URL', 400));
    }
    next(error);
  }
};

// @desc    Get all checks for authenticated user
// @route   GET /api/checks
// @access  Private
exports.getChecks = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Task 13: Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Task 14: Filtering
    const filter = { userId };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.tags) {
      // Support filtering by multiple tags: ?tags=production,api
      const tagsArray = req.query.tags.split(',');
      filter.tags = { $in: tagsArray };
    }

    // Task 15: Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Execute query
    const checks = await Check.find(filter)
      .sort(sort)
      .limit(limit)
      .skip(skip);

    // Get total count for pagination
    const total = await Check.countDocuments(filter);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      count: checks.length,
      checks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single check
// @route   GET /api/checks/:id
// @access  Private
exports.getCheck = async (req, res, next) => {
  try {
    const check = await Check.findById(req.params.id);

    if (!check) {
      return next(new ErrorResponse('Check not found', 404));
    }

    // Task 7: Object-level authorization - ensure user owns this check
    if (check.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this check', 403));
    }

    res.status(200).json({
      success: true,
      check
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return next(new ErrorResponse('Check not found', 404));
    }
    next(error);
  }
};

// @desc    Update check
// @route   PUT /api/checks/:id
// @access  Private
exports.updateCheck = async (req, res, next) => {
  try {
    let check = await Check.findById(req.params.id);

    if (!check) {
      return next(new ErrorResponse('Check not found', 404));
    }

    // Task 7: Object-level authorization
    if (check.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to modify this check', 403));
    }

    // Check if interval is being updated and validate against tier
    if (req.body.interval) {
      const intervalCheck = isIntervalAllowed(req.body.interval, req.user.subscriptionTier);
      if (!intervalCheck.allowed) {
        return next(new ErrorResponse(intervalCheck.message, 403));
      }
    }

    // If URL is being updated, check for duplicates
    if (req.body.url && req.body.url !== check.url) {
      const existingCheck = await Check.findOne({
        userId: req.user.id,
        url: req.body.url,
        _id: { $ne: req.params.id }
      });

      if (existingCheck) {
        return next(new ErrorResponse('You are already monitoring this URL', 400));
      }
    }

    // Update check
    check = await Check.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      check
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return next(new ErrorResponse('Check not found', 404));
    }
    next(error);
  }
};

// @desc    Delete check
// @route   DELETE /api/checks/:id
// @access  Private
exports.deleteCheck = async (req, res, next) => {
  try {
    const check = await Check.findById(req.params.id);

    if (!check) {
      return next(new ErrorResponse('Check not found', 404));
    }

    // Task 7: Object-level authorization
    if (check.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to delete this check', 403));
    }

    await check.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Check deleted successfully',
      data: {}
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return next(new ErrorResponse('Check not found', 404));
    }
    next(error);
  }
};

// @desc    Get check statistics for user
// @route   GET /api/checks/stats
// @access  Private
exports.getCheckStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get total count
    const total = await Check.countDocuments({ userId });

    // Get active count
    const active = await Check.countDocuments({ userId, isActive: true });

    // Get paused count
    const paused = await Check.countDocuments({ userId, isActive: false });

    // Get status breakdown
    const statusBreakdown = await Check.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Format status breakdown
    const statusCounts = {
      up: 0,
      down: 0,
      paused: 0
    };

    statusBreakdown.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        paused,
        statusBreakdown: statusCounts
      }
    });
  } catch (error) {
    next(error);
  }
};