const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const setupSwagger = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Swagger API Documentation
setupSwagger(app);

// API Routes
app.use('/admin', adminRoutes);
app.use('/students', studentRoutes);
app.use('/ai', aiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Student Registration API is running smoothly.' });
});

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.url}' not found.`
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`🚀 Student Registration System server running!`);
  console.log(`🌐 Web Interface:    http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📚 Swagger API Docs: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api-docs`);
  console.log(`====================================================`);
});
