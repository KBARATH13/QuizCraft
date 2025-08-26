const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String, // e.g., 'fas fa-star', or a path to an image
    required: true,
  },
  // The rule for how this badge is earned
  criteria: {
    type: {
      type: String, // e.g., 'level', 'streak', 'quizzesCompleted', 'perfectScore'
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // The target value for the criteria type
      required: true,
    },
  },
  // A short, encouraging phrase for the user
  phrase: {
      type: String,
      required: true,
  }
});

module.exports = mongoose.model('Badge', badgeSchema);
