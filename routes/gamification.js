const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Badge = require('../models/Badge');
const Quiz = require('../models/quiz');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/all-categories', async (req, res) => {
  try {
    const categories = await Quiz.distinct('categories');
    res.json(categories);
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/badges', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    

    const user = await User.findById(userId); // Fetch entire user document
    
    
    

    // Get the IDs of all available badges first
    const allBadges = await Badge.find({});
    

    // Create a map from badge name to badge ID for efficient lookup
    const badgeNameToIdMap = new Map(allBadges.map(b => [b.name, b._id.toString()]));

    // Get the IDs of the badges the user has earned (from the 'badges' field)
    const earnedBadgeIds = user?.badges?.map(badgeName => badgeNameToIdMap.get(badgeName))
                           .filter(id => id) || []; // Filter out any undefined if name not found
    

    const badgesWithEarnedStatus = allBadges.map(badge => {
      const isEarned = earnedBadgeIds.includes(badge._id.toString());
      
      return {
        ...badge.toObject(),
        isEarned: isEarned
      };
    });

    res.json(badgesWithEarnedStatus);
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { country, subdivision1, subdivision2 } = req.query;
    const query = {};

    if (country) {
      query['location.country'] = new RegExp(`^${country}`, 'i');
    }

    if (subdivision1) {
      query['location.subdivision1'] = new RegExp(`^${subdivision1}`, 'i');
    }

    if (subdivision2) {
      query['location.subdivision2'] = new RegExp(`^${subdivision2}`, 'i');
    }

    if (!country && !subdivision1 && !subdivision2) {
      const user = await User.findById(req.user.id).select('location.country location.subdivision1 location.subdivision2');
      if (user && user.location) {
        if (user.location.country) {
          query['location.country'] = new RegExp(`^${user.location.country}`, 'i');
        }
        if (user.location.subdivision1) {
          query['location.subdivision1'] = new RegExp(`^${user.location.subdivision1}`, 'i');
        }
        if (user.location.subdivision2) {
          query['location.subdivision2'] = new RegExp(`^${user.location.subdivision2}`, 'i');
        }
      }
    }

    const leaderboard = await User.find(query)
      .sort({ points: -1 })
      .limit(10)
      .select('username points level profilePicture location');
    res.json(leaderboard);
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;