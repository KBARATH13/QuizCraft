const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const authMiddleware = require('../middleware/authMiddleware');
const { calculateLevel } = require('../services/gamificationService');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { country, subdivision1, subdivision2 } = req.query;
    let query = {};

    if (country) {
      query['location.country'] = country;
    }
    if (subdivision1) {
      query['location.subdivision1'] = subdivision1;
    }
    if (subdivision2) {
      query['location.subdivision2'] = subdivision2;
    }

    const leaderboard = await User.find(query)
      .sort({ points: -1 })
      .limit(100)
      .select('username points xp profilePicture'); // Select xp instead of level

    // Calculate level for each user in the leaderboard
    const leaderboardWithCalculatedLevel = leaderboard.map(user => ({
      ...user.toObject(),
      level: calculateLevel(user.xp).level
    }));

    
    res.json(leaderboardWithCalculatedLevel);
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/classroom/:classroomId', authMiddleware, async (req, res) => {
    try {
      const classroom = await Classroom.findById(req.params.classroomId);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found.' });
      }
  
      const studentIds = classroom.students;
      const leaderboard = await User.find({ '_id': { $in: studentIds } })
                                    .sort({ points: -1 })
                                    .limit(10)
                                    .select('username points xp level profilePicture');
  
      res.json(leaderboard);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;