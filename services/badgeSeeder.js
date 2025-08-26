const mongoose = require('mongoose');
const Badge = require('../models/Badge');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const badges = [
  // Level Badges
  {
    name: 'Newbie',
    icon: 'fas fa-baby',
    description: 'Just starting out.',
    phrase: 'Welcome to the club!',
    criteria: { type: 'level', value: 1 },
  },
  {
    name: 'Apprentice',
    icon: 'fas fa-child',
    description: "You're learning the ropes.",
    phrase: 'Keep up the great work!',
    criteria: { type: 'level', value: 5 },
  },
  {
    name: 'Journeyman',
    icon: 'fas fa-route',
    description: "You're on your way.",
    phrase: 'The journey is the reward.',
    criteria: { type: 'level', value: 10 },
  },
  {
    name: 'Master',
    icon: 'fas fa-crown',
    description: "You've achieved mastery.",
    phrase: 'All hail the master!',
    criteria: { type: 'level', value: 20 },
  },
  {
    name: 'Legend',
    icon: 'fas fa-star',
    description: 'Your name will be remembered.',
    phrase: 'A true legend!',
    criteria: { type: 'level', value: 50 },
  },
  // Achievement Badges
  {
    name: 'First Quiz',
    icon: 'fas fa-pencil-alt',
    description: "You've completed your first quiz.",
    phrase: 'The first of many!',
    criteria: { type: 'quizzesCompleted', value: 1 },
  },
  {
    name: 'Quiz Whiz',
    icon: 'fas fa-graduation-cap',
    description: "You've completed 10 quizzes.",
    phrase: "You're a real quiz whiz!",
    criteria: { type: 'quizzesCompleted', value: 10 },
  },
  {
    name: 'Perfect Score',
    icon: 'fas fa-bullseye',
    description: 'You got a perfect score on a quiz.',
    phrase: 'Bullseye!',
    criteria: { type: 'perfectScore', value: 1 },
  },
  {
    name: 'Hot Streak',
    icon: 'fas fa-fire',
    description: "You've completed 3 quizzes in a row.",
    phrase: "You're on fire!",
    criteria: { type: 'streak', value: 3 },
  },
  {
    name: 'Creator',
    icon: 'fas fa-hammer',
    description: "You've created your first quiz.",
    phrase: "Now you're a creator!",
    criteria: { type: 'create', value: 1 },
  },
  {
    name: 'Scholar',
    icon: 'fas fa-book-open',
    description: "You've explored a variety of quiz categories.",
    phrase: 'A true scholar!',
    criteria: { type: 'category', value: 5 },
  },
  {
    name: 'Comet',
    icon: 'fas fa-meteor',
    description: 'You answered 20 questions in a single quiz.',
    phrase: 'Blazing fast!',
    criteria: { type: 'speed', value: 20 },
  },
  {
    name: 'Treasurer',
    icon: 'fas fa-coins',
    description: "You've earned 1000 points.",
    phrase: 'Rich in knowledge!',
    criteria: { type: 'points', value: 1000 },
  },
  {
    name: 'Collector',
    icon: 'fas fa-gem',
    description: "You've collected 5 badges.",
    phrase: 'A fine collection!',
    criteria: { type: 'badge', value: 5 },
  },
  {
    name: 'Energizer',
    icon: 'fas fa-bolt',
    description: "You've played quizzes for 7 days in a row.",
    phrase: 'Full of energy!',
    criteria: { type: 'streak', value: 7 },
  },
  {
    name: 'Mastermind',
    icon: 'fas fa-brain',
    description: "You've aced a quiz in the 'Science' category.",
    phrase: 'A true mastermind!',
    criteria: { type: 'category_ace', value: 'Science' },
  },
  {
    name: 'Socialite',
    icon: 'fas fa-users',
    description: "You've invited a friend.",
    phrase: 'The more the merrier!',
    criteria: { type: 'friends_invited', value: 1 },
  },
  {
    name: 'Night Owl',
    icon: 'fas fa-moon',
    description: "You've completed a quiz after midnight.",
    phrase: 'Hoot hoot!',
    criteria: { type: 'quiz_after_hour', value: 23 },
  },
  {
    name: 'Early Bird',
    icon: 'fas fa-sun',
    description: "You've completed a quiz before 6 AM.",
    phrase: 'The early bird gets the worm!',
    criteria: { type: 'quiz_before_hour', value: 6 },
  },
  {
    name: 'Scientist',
    icon: 'fas fa-microscope',
    description: "You've completed a quiz on 'Biology'.",
    phrase: 'For science!',
    criteria: { type: 'topic_completed', value: 'Biology' },
  },
  {
    name: 'Globetrotter',
    icon: 'fas fa-globe',
    description: "You've completed a quiz on 'Geography'.",
    phrase: 'Around the world!',
    criteria: { type: 'topic_completed', value: 'Geography' },
  },
  {
    name: 'Hydrated',
    icon: 'fas fa-tint',
    description: "You've completed a quiz on 'Chemistry'.",
    phrase: 'Stay hydrated!',
    criteria: { type: 'topic_completed', value: 'Chemistry' },
  },
  {
    name: 'Champion',
    icon: 'fas fa-trophy',
    description: "You've reached the top of the leaderboard.",
    phrase: 'The champion is here!',
    criteria: { type: 'leaderboard', value: 1 },
  },
  {
    name: 'Consistent',
    icon: 'fas fa-chart-line',
    description: "You've maintained a 5-day streak.",
    phrase: 'Consistency is key!',
    criteria: { type: 'streak', value: 5 },
  },
  {
    name: 'Weekly Planner',
    icon: 'fas fa-calendar-check',
    description: "You started your week with a quiz!",
    phrase: 'A great start to the week!',
    criteria: { type: 'day_of_week', value: 1 },
  },
];

const seedBadges = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    await Badge.deleteMany({});
    console.log('Existing badges cleared.');

    await Badge.insertMany(badges);
    console.log('Badges have been seeded!');

  } catch (err) {
    console.error(err.message);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

seedBadges();