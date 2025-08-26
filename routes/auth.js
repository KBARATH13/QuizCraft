const express = require('express');
const router = express.Router();
console.log('Auth router active');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage });

router.post('/register', upload.single('profilePicture'), async (req, res) => {
  const { password, username, role } = req.body;
  const email = req.body.email.toLowerCase().trim();
  if (!email || !password || !username || !role) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      role,
      profilePicture: req.file ? req.file.path.replace(/\\/g, '/') : undefined, // Save profile picture path if uploaded
    });
    await newUser.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ message: 'Email already exists' });
  }
});

const { checkAndAwardBadges } = require('../services/badgeService');

router.post('/login', async (req, res) => {
  const { password } = req.body;
  const email = req.body.email.toLowerCase().trim();
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    
    await checkAndAwardBadges(user._id); // Check for new badges

    const token = jwt.sign({ user: { id: user._id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      // Add any other user fields you want to return
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'lax', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }).json({ role: user.role, userProfile });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/profile-picture', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.profilePicture = req.file.path.replace(/\\/g, '/');
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { location } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update location fields
    user.location = location; // Mongoose will handle schema-less saving if 'location' is not defined in schema

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token').json({ message: 'Logged out successfully' });
});

module.exports = router;