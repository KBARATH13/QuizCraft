const express = require('express');
const router = express.Router();
const Quiz = require('../models/quiz');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const authMiddleware = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const { checkAndAwardBadges } = require('../services/badgeService');

function calculateLevel(xp) {
    // Level 0
    if (xp < 10) {
        return {
            level: 0,
            xpForCurrentLevel: 0, // Total XP accumulated to start this level
            xpToNextLevel: 10,      // Total XP needed to reach next level
            xpProgress: xp,         // XP earned within the current level
            xpRemainingForNextLevel: 10 - xp
        };
    }

    let cumulativeXp = 10; // XP needed to reach level 1

    for (let i = 1; i < 50; i++) {
        const xpNeededForNextLevel = 10 * (i + 1);
        if (xp < cumulativeXp + xpNeededForNextLevel) {
            return {
                level: i,
                xpForCurrentLevel: cumulativeXp,
                xpToNextLevel: cumulativeXp + xpNeededForNextLevel,
                xpProgress: xp - cumulativeXp,
                xpRemainingForNextLevel: (cumulativeXp + xpNeededForNextLevel) - xp
            };
        }
        cumulativeXp += xpNeededForNextLevel;
    }

    // Handle max level (50)
    const xpForLevel50Start = cumulativeXp;
    return {
        level: 50,
        xpForCurrentLevel: xpForLevel50Start,
        xpToNextLevel: xpForLevel50Start, // No next level
        xpProgress: xp - xpForLevel50Start,
        xpRemainingForNextLevel: 0
    };
}

router.post('/', authMiddleware, async (req, res) => {
  const { title, topic, questions, visibility, categories } = req.body;
  try {
    const quiz = new Quiz({ title, topic, questions, createdBy: req.user.id, visibility, categories });
    await quiz.save();
    await checkAndAwardBadges(req.user.id);
    res.status(201).json(quiz);
  } catch (err) {
    
    res.status(400).json({ message: 'Failed to create quiz' });
  }
});

router.get('/', async (req, res) => {
  try {
    let query = { visibility: 'public' };
    const { search, category } = req.query;

    // Check if user is authenticated via authMiddleware (which uses cookies)
    if (req.user && req.user.id) {
      query = { $or: [{ visibility: 'public' }, { createdBy: req.user.id }] };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      if (query.$or) {
        query.$or = query.$or.map(condition => ({ ...condition, title: { $regex: searchRegex } }));
      } else {
        query.title = { $regex: searchRegex };
      }
    }

    if (category) {
      query.categories = category;
    }

    const quizzes = await Quiz.find(query).select('title topic visibility categories createdBy questions');
    res.json(quizzes);
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (err) {
    
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const { answers, timeTaken } = req.body;
    let score = 0;
    const results = quiz.questions.map((q, index) => {
      const isCorrect = answers[index] === q.correctAnswer;
      if (isCorrect) {
        score++;
      }
      return {
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer: answers[index],
        isCorrect: isCorrect,
      };
    });

    const detailedResults = results.map(r => ({ questionText: r.questionText, questionTopic: quiz.topic, isCorrect: r.isCorrect }));

    const user = await User.findById(req.user.id);
    if (user) {
      const pointsEarned = score * 10;
      const xpEarned = score;

      const existingAttempt = await QuizAttempt.findOne({ user: req.user.id, quiz: quiz._id });

      if (!existingAttempt) {
        user.points += pointsEarned;
        user.xp += xpEarned;
        const { level: newLevel } = calculateLevel(user.xp);
        user.level = newLevel;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastChallengeDate = user.lastDailyChallengeDate ? new Date(user.lastDailyChallengeDate) : null;
      if (lastChallengeDate) {
        lastChallengeDate.setHours(0, 0, 0, 0);
      }

      if (lastChallengeDate && lastChallengeDate.getTime() === today.getTime()) {
        user.completedDailyQuizzes += 1;
      } else {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        if (lastChallengeDate && lastChallengeDate.getTime() !== yesterday.getTime()) {
          user.streaks = 0;
        }
        user.streaks += 1;
        user.completedDailyQuizzes = 1;
        user.lastDailyChallengeDate = today;
      }

      await user.save();
      
      await checkAndAwardBadges(user._id);
    }

    res.json({ score, total: quiz.questions.length, results });

    const quizAttempt = new QuizAttempt({ user: req.user.id, quiz: quiz._id, score: score, totalQuestions: quiz.questions.length, detailedResults: detailedResults, timeTaken: timeTaken });
    await quizAttempt.save();
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this quiz' });
    }

    await quiz.deleteOne();
    res.json({ message: 'Quiz removed' });
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { title, topic, questions, visibility, categories } = req.body;
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this quiz' });
    }

    quiz.title = title;
    quiz.topic = topic;
    quiz.questions = questions;
    quiz.visibility = visibility;
    quiz.categories = categories;
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    
    res.status(400).json({ message: 'Failed to update quiz' });
  }
});



module.exports = router;