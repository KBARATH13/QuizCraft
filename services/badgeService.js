const User = require('../models/User');
const Badge = require('../models/Badge');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');

const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId).populate('displayedBadges');
    if (!user) return;

    const userBadges = user.badges || [];
    const allBadges = await Badge.find({});

    for (const badge of allBadges) {
      if (userBadges.includes(badge.name)) continue; // User already has this badge

      let earned = false;
      const { type, value } = badge.criteria;

      switch (type) {
        case 'level':
          if (user.level >= value) earned = true;
          break;
        case 'quizzesCompleted':
          const quizCount = await QuizAttempt.countDocuments({ userId });
          if (quizCount >= value) earned = true;
          break;
        case 'perfectScore':
            const perfectScoreAttempt = await QuizAttempt.findOne({ userId, $expr: { $eq: ['$score', '$totalQuestions'] } });
            if (perfectScoreAttempt) earned = true;
            break;
        case 'streak':
          if (user.streaks >= value) earned = true;
          break;
        case 'points':
          if (user.points >= value) earned = true;
          break;
        case 'create':
          const createdQuizCount = await Quiz.countDocuments({ createdBy: userId });
          if (createdQuizCount >= value) earned = true;
          break;
        case 'category':
          const distinctCategories = await QuizAttempt.distinct('detailedResults.questionTopic', { userId });
          if (distinctCategories.length >= value) earned = true;
          break;
        case 'speed':
          const longQuizAttempt = await QuizAttempt.findOne({ userId, totalQuestions: { $gte: value } });
          if (longQuizAttempt) earned = true;
          break;
        case 'badge':
          if (user.badges.length >= value) earned = true;
          break;
        case 'category_ace':
          const aceAttempt = await QuizAttempt.findOne({
            userId,
            $expr: { $eq: ['$score', '$totalQuestions'] }
          }).populate({
            path: 'quiz',
            match: { categories: { $in: [value] } } // Assuming value is a category name
          });
          if (aceAttempt && aceAttempt.quiz) earned = true;
          break;
        case 'friends_invited':
          if (user.friends.length >= value) earned = true;
          break;
        case 'quiz_after_hour':
          const lateAttempt = await QuizAttempt.findOne({ userId, $expr: { $gte: [{ $hour: '$createdAt' }, value] } });
          if (lateAttempt) earned = true;
          break;
        case 'quiz_before_hour':
          const earlyAttempt = await QuizAttempt.findOne({ userId, $expr: { $lte: [{ $hour: '$createdAt' }, value] } });
          if (earlyAttempt) earned = true;
          break;
        case 'topic_completed':
          const topicAttempt = await QuizAttempt.findOne({
            userId,
            'detailedResults.questionTopic': value
          });
          if (topicAttempt) earned = true;
          break;
        case 'leaderboard':
          const users = await User.find().sort({ points: -1 }).limit(value);
          if (users.some(u => u._id.equals(userId))) earned = true;
          break;
        case 'day_of_week':
          const dayOfWeekAttempt = await QuizAttempt.findOne({ userId, $expr: { $eq: [{ $dayOfWeek: '$createdAt' }, value] } });
          if (dayOfWeekAttempt) earned = true;
          break;
        // Add more cases for other badge criteria here
      }

      if (earned) {
        user.badges.push(badge.name);
        // If the user has less than 5 displayed badges, add this new one automatically
        if (user.displayedBadges.length < 5) {
            user.displayedBadges.push(badge._id);
        }
      }
    }

    
    
    
    await user.save();
    
    

  } catch (error) {
    
  }
};

module.exports = { checkAndAwardBadges };