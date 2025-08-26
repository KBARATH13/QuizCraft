const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: { type: String },
  topic: { type: String },
  questions: [
    {
      questionText: { type: String, required: true },
      options: { type: [String], required: true },
      correctAnswer: { type: Number, required: true },
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  categories: [String],
});

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);