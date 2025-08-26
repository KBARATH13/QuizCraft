const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeTaken: { type: Number, required: false },
  attemptedAt: { type: Date, default: Date.now },
  detailedResults: [
    {
      questionText: { type: String, required: true },
      questionTopic: { type: String, required: true }, // Store the topic for the question
      isCorrect: { type: Boolean, required: true },
    },
  ],
});

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
