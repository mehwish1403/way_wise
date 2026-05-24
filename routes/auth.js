const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Trip = require('../models/Trip');
const Budget = require('../models/Budget');
const WeatherSearch = require('../models/WeatherSearch');
const { isGuest, isLoggedIn } = require('../middleware/auth');

router.get('/login', isGuest, (req, res) => {
  res.render('login', { title: 'Login – Waywise', error: null, user: null });
});

router.post('/login', isGuest, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.render('login', { title: 'Login – Waywise', error: 'No account found with this email.', user: null });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.render('login', { title: 'Login – Waywise', error: 'Incorrect password.', user: null });
    req.session.userId    = user._id;
    req.session.userName  = user.name;
    req.session.userEmail = user.email;
    req.session.role      = user.role;
    user.lastLogin = new Date();
    await user.save();
    const redirectTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectTo);
  } catch (err) {
    res.render('login', { title: 'Login – Waywise', error: 'Something went wrong.', user: null });
  }
});

router.get('/signup', isGuest, (req, res) => {
  res.render('signup', { title: 'Sign Up – Waywise', error: null, user: null });
});

router.post('/signup', isGuest, async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.render('signup', { title: 'Sign Up – Waywise', error: 'Passwords do not match.', user: null });
  if (password.length < 6) return res.render('signup', { title: 'Sign Up – Waywise', error: 'Password must be at least 6 characters.', user: null });
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.render('signup', { title: 'Sign Up – Waywise', error: 'Email already registered.', user: null });
    const newUser = await User.create({ name, email, phone, password });
    req.session.userId    = newUser._id;
    req.session.userName  = newUser.name;
    req.session.userEmail = newUser.email;
    req.session.role      = newUser.role;
    res.redirect('/');
  } catch (err) {
    res.render('signup', { title: 'Sign Up – Waywise', error: 'Something went wrong.', user: null });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    const trips = await Trip.find({ user: req.session.userId })
      .select('tripTitle origin destination startDate endDate numDays createdAt')
      .sort('-createdAt')
      .lean();
    const budgets = await Budget.find({ user: req.session.userId })
      .select('tripName totalBudget currency members expenses createdAt')
      .sort('-createdAt')
      .lean();
    const weatherSearches = await WeatherSearch.find({ user: req.session.userId })
      .select('city type temperature description createdAt')
      .sort('-createdAt')
      .limit(10)
      .lean();

    res.render('profile', {
      title: 'My Profile – Waywise',
      user: { name: req.session.userName, email: req.session.userEmail, role: req.session.role },
      fullUser: user,
      trips,
      budgets,
      weatherSearches
    });
  } catch (err) {
    console.error('Profile load error:', err);
    res.redirect('/');
  }
});

module.exports = router;