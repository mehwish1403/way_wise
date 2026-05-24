// ============================================================
//  WAYWISE - server.js
//  Main Express server — entry point of the app
// ============================================================

// 1. Load environment variables FIRST (before anything else)
require('dotenv').config();
// Prevent unhandled promise rejections from crashing server
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});

const express      = require('express');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const path         = require('path');
const connectDB    = require('./config/db');

// Import Routes
const indexRoutes = require('./routes/index');
const authRoutes  = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// ── Connect to MongoDB ──
connectDB().catch(() => {
  console.log('⚠️ MongoDB failed but server will continue running');
});

// ── Create Express App ──
const app = express();

// ── View Engine Setup ──
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ──

// Serve static files (CSS, JS, images) from /public folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse incoming form data (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// Parse incoming JSON data (from fetch/axios API calls)
app.use(express.json());

// Session setup — stores login state in MongoDB
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 7 * 24 * 60 * 60  // Sessions last 7 days
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    httpOnly: true                    // Prevents JS access to cookie (security)
  }
}));

// ── Global Template Variables ──
// Makes user info available in ALL EJS templates automatically
app.use((req, res, next) => {
  res.locals.currentUser  = req.session.userName  || null;
  res.locals.currentRole  = req.session.role      || null;
  res.locals.currentEmail = req.session.userEmail || null;
  res.locals.isLoggedIn   = !!req.session.userId;
  next();
});

// ── Routes ──
// ── Routes ──
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found</h1><a href="/">Go Home</a>');
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).send('<h1>500 - Server Error</h1><a href="/">Go Home</a>');
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).render('error', {
    title: '500 – Server Error',
    message: 'Something went wrong on our end. Please try again.',
    user: req.session.userName || null
  });
});

// ── Start Server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Waywise server running at http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});