const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Express app initialize
const app = express();

// Create HTTP server (needed for Socket.io)
const server = http.createServer(app);

// Attach Socket.io to the HTTP server
const io = new Server(server, {
  cors: {
    origin: '*', // Local dev ke liye sab allow hai
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible from anywhere via app.get('io')
app.set('io', io);

// Middlewares
app.use(express.json());
app.use(cors());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const expoRoutes = require('./routes/expoRoutes');
const boothRoutes = require('./routes/boothRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const extraRoutes = require('./routes/extraRoutes');
const messageRoutes = require('./routes/messageRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

// Use Routes (API Endpoints)
app.use('/api/auth', authRoutes);
app.use('/api/expos', expoRoutes);
app.use('/api/booths', boothRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/extra', extraRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/feedback', feedbackRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('EventSphere Management Backend is running!');
});

// ===== Socket.io Real-time Events =====
// Frontend se jab bhi koi message bhejega, sabko broadcast kar denge
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Chat message broadcast
  socket.on('NEW_CHAT_MESSAGE', (msg) => {
    io.emit('NEW_CHAT_MESSAGE', msg);
  });

  // Booth status change broadcast (admin approve/decline kare toh exhibitor ko update mile)
  socket.on('BOOTH_STATUS_CHANGED', (data) => {
    io.emit('BOOTH_STATUS_CHANGED', data);
  });

  // Expo created broadcast
  socket.on('EXPO_CREATED', (data) => {
    io.emit('EXPO_CREATED', data);
  });

  // Feedback submitted broadcast
  socket.on('FEEDBACK_SUBMITTED', (data) => {
    io.emit('FEEDBACK_SUBMITTED', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Database Connection & Server Start
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Atlas Connected Successfully!');
    // NOTE: ab server.listen use hoga, app.listen nahi
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.io is listening on the same port`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err.message);
  });
