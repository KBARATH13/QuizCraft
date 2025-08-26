const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  quizzes: [{
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
    },
    quizTakingStyle: {
        showCorrectAnswer: {
            type: Boolean,
            default: false,
        },
        numberOfAttempts: {
            type: Number,
            default: 1,
        },
    },
  }],
  classCode: {
    type: String,
    required: true,
    unique: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);