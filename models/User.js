const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  email: { type: String, unique: true },
  role: { type: String, enum: ['student', 'teacher'], default: 'student' },
  profilePicture: { type: String },
  streaks: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: { type: [String], default: [] },
  displayedBadges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  lastDailyChallengeDate: { type: Date },
  completedDailyQuizzes: { type: Number, default: 0 },
  classrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentFriendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  receivedFriendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  location: {
    country: { type: String, default: '' },
    subdivision1: { type: String, default: '' },
    subdivision2: { type: String, default: '' },
  },
  locationPreferences: {
    subdivision1Label: { type: String, default: 'Subdivision 1' },
    subdivision2Label: { type: String, default: 'Subdivision 2' },
  },
});

module.exports = mongoose.model('User', UserSchema);