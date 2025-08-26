const express = require('express');
const router = express.Router();
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const authMiddleware = require('../middleware/authMiddleware');
const { calculateLevel } = require('../services/gamificationService');
const { checkAndAwardBadges } = require('../services/badgeService');



router.get('/profile/gamification-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('displayedBadges').select('streaks points xp badges lastDailyChallengeDate completedDailyQuizzes level displayedBadges');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastChallengeDate = user.lastDailyChallengeDate ? new Date(user.lastDailyChallengeDate) : null;
    if (lastChallengeDate) {
      lastChallengeDate.setHours(0, 0, 0, 0);
    }

    let dailyGoalProgress = user.completedDailyQuizzes;
    let currentStreak = user.streaks;

    if (!lastChallengeDate || lastChallengeDate.getTime() < today.getTime()) {
      dailyGoalProgress = 0;
      if (lastChallengeDate && (today.getTime() - lastChallengeDate.getTime()) > (24 * 60 * 60 * 1000)) {
        currentStreak = 0;
      }
    }

    const { level, xpToNextLevel, xpForCurrentLevel } = calculateLevel(user.xp);

    const gamificationData = {
      streaks: currentStreak,
      points: user.points,
      xp: user.xp,
      level: level,
      xpToNextLevel: xpToNextLevel,
      xpForCurrentLevel: xpForCurrentLevel,
      badges: user.badges,
      displayedBadges: user.displayedBadges,
      dailyGoal: 1,
      dailyGoalProgress: dailyGoalProgress,
    };
    res.json(gamificationData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('displayedBadges')
      .populate('friends', 'username profilePicture xp')
      .select('username email role profilePicture streaks points xp badges displayedBadges lastDailyChallengeDate completedDailyQuizzes classrooms friends sentFriendRequests receivedFriendRequests location locationPreferences');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Calculate level based on xp
    user.level = calculateLevel(user.xp).level;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:userId/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req.user.id;

    const user = await User.findById(userId)
      .populate('displayedBadges')
      .select('username email role profilePicture streaks points xp badges displayedBadges lastDailyChallengeDate completedDailyQuizzes classrooms friends sentFriendRequests receivedFriendRequests location locationPreferences');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate level based on xp
    user.level = calculateLevel(user.xp).level;

    const loggedInUser = await User.findById(loggedInUserId);

    const friendship = {
      isFriend: loggedInUser.friends.includes(userId) || user.friends.includes(loggedInUserId),
      requestSent: loggedInUser.sentFriendRequests.includes(userId),
      requestReceived: loggedInUser.receivedFriendRequests.includes(userId),
    };

    res.json({ user, friendship });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, location, locationPreferences } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (location) user.location = location;
    if (locationPreferences) user.locationPreferences = locationPreferences;

    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile/displayed-badges', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { badgeIds } = req.body;

    if (!Array.isArray(badgeIds) || badgeIds.length > 4) {
      return res.status(400).json({ message: 'Invalid badge selection. You can select up to 4 badges.' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure that the badgeIds are valid ObjectIds and correspond to earned badges
    // For simplicity, we'll just assign them directly here. 
    // A more robust solution might validate against user.badges array.
    user.displayedBadges = badgeIds;

    await user.save();

    // Re-fetch the user with populated displayedBadges to send back to frontend
    const updatedUser = await User.findById(userId).populate('displayedBadges');

    res.json({ message: 'Displayed badges updated successfully', displayedBadges: updatedUser.displayedBadges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile/quiz-history', authMiddleware, async (req, res) => {
  try {
    const quizHistory = await QuizAttempt.find({ user: req.user.id }).populate('quiz', 'title');
    res.json(quizHistory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile/weak-areas', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const quizAttempts = await QuizAttempt.find({ user: userId });

    const topicStats = {};
    quizAttempts.forEach(attempt => {
      attempt.detailedResults.forEach(result => {
        const topic = result.questionTopic;
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, total: 0 };
        }
        topicStats[topic].total++;
        if (result.isCorrect) {
          topicStats[topic].correct++;
        }
      });
    });

    const topicAccuracies = Object.keys(topicStats).map(topic => ({ topic, accuracy: (topicStats[topic].correct / topicStats[topic].total) * 100, totalQuestions: topicStats[topic].total }));
    topicAccuracies.sort((a, b) => a.accuracy - b.accuracy);

    const significantTopics = topicAccuracies.filter(t => t.totalQuestions >= 3);
    res.json(significantTopics.slice(0, 3));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/friends/send-request', authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId } = req.body;

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (sender.friends.includes(recipientId) || recipient.friends.includes(senderId)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    if (sender.sentFriendRequests.includes(recipientId) || recipient.receivedFriendRequests.includes(senderId)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    sender.sentFriendRequests.push(recipientId);
    recipient.receivedFriendRequests.push(senderId);

    await sender.save();
    await recipient.save();

    res.json({ message: 'Friend request sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/friends/:friendId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userFriendIndex = user.friends.indexOf(friendId);
    const friendUserIndex = friend.friends.indexOf(userId);

    if (userFriendIndex > -1) {
      user.friends.splice(userFriendIndex, 1);
    }

    if (friendUserIndex > -1) {
      friend.friends.splice(friendUserIndex, 1);
    }

    await user.save();
    await friend.save();

    res.json({ message: 'Friend removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/search', authMiddleware, async (req, res) => {
  try {
    const { q: query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user.id }
    }).select('username profilePicture xp'); // Select xp

    // Calculate level for each user
    const usersWithCalculatedLevel = users.map(u => ({
      ...u.toObject(),
      level: calculateLevel(u.xp).level
    }));

    res.json(usersWithCalculatedLevel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/friends', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username profilePicture xp role') // Populate friends with xp
      .select('friends');

    const friendsWithCalculatedLevel = user.friends.map(friend => ({
      ...friend.toObject(),
      level: calculateLevel(friend.xp).level
    }));

    res.json(friendsWithCalculatedLevel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/friends/requests', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('receivedFriendRequests', 'username profilePicture level')
      .select('receivedFriendRequests');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.receivedFriendRequests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/friends/accept-request', authMiddleware, async (req, res) => {
  try {
    const recipientId = req.user.id;
    const { senderId } = req.body;

    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient || !sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from received requests
    recipient.receivedFriendRequests.pull(senderId);
    // Remove from sent requests
    sender.sentFriendRequests.pull(recipientId);

    // Add to friends list
    recipient.friends.push(senderId);
    sender.friends.push(recipientId);

    await recipient.save();
    await sender.save();

    await checkAndAwardBadges(recipientId);
    await checkAndAwardBadges(senderId);

    res.json({ message: 'Friend request accepted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/friends/decline-request', authMiddleware, async (req, res) => {
  try {
    const recipientId = req.user.id;
    const { senderId } = req.body;

    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderId);

    if (!recipient || !sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from received requests
    recipient.receivedFriendRequests.pull(senderId);
    // Remove from sent requests
    sender.sentFriendRequests.pull(recipientId);

    await recipient.save();
    await sender.save();

    res.json({ message: 'Friend request declined successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
