require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // Import http module
const WebSocket = require('ws'); // Import WebSocket module
const multer = require('multer'); // Import multer
const path = require('path'); // Import path module
const fs = require('fs'); // Import fs module

const authRoutes = require('./routes/auth');
const classroomRoutes = require('./routes/classroom'); // Import classroom routes
const quizRoutes = require('./routes/quiz');
const userRoutes = require('./routes/user');
const gamificationRoutes = require('./routes/gamification');
const aiRoutes = require('./routes/ai');
const chatRoutes = require('./routes/chat'); // Import chat routes
const leaderboardRoutes = require('./routes/leaderboard');
const locationRoutes = require('./routes/location');
const setupWebSocket = require('./websocketHandler'); // Import WebSocket handler
const authMiddleware = require('./middleware/authMiddleware');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

const cookieParser = require('cookie-parser');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create a temporary directory for PDF uploads if it doesn't exist
const tempUploadDir = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir);
}

// Multer storage configuration for PDF uploads
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const uploadPdf = multer({ storage: pdfStorage });

mongoose.connect(process.env.MONGO_URI, {
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes); // Use classroom routes


// Expose uploadPdf middleware
app.uploadPdf = uploadPdf;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server without attaching it to the HTTP server directly
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade requests manually
server.on('upgrade', (request, socket, head) => {
  const cookies = cookie.parse(request.headers.cookie || '');
  const token = cookies.token;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('WebSocket Auth Error:', err.message);
        socket.destroy();
        return;
      }
      request.user = decoded.user;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
  } else {
    console.log('WebSocket Auth: No token cookie found. Connection rejected.');
    socket.destroy();
  }
});

wss.on('error', error => {
  console.error('WebSocket Server Error:', error);
});

// Setup WebSocket message handling
setupWebSocket(wss);

// Pass wss and app to apiRoutes so they can be used for quiz generation and file uploads
const apiMiddleware = (req, res, next) => {
  req.wss = wss;
  req.app = app; // Pass the app object
  next();
};

app.use('/api/quizzes', authMiddleware, apiMiddleware, quizRoutes);
app.use('/api/leaderboard', apiMiddleware, leaderboardRoutes);
app.use('/api', apiMiddleware, userRoutes);
app.use('/api', apiMiddleware, gamificationRoutes);
app.use('/api', apiMiddleware, aiRoutes);
app.use('/api/chat', apiMiddleware, chatRoutes); // Add this line
app.use('/api/locations', locationRoutes);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));