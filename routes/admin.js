const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Trip = require('../models/Trip');
const { isAdmin } = require('../middleware/auth');

// ── GET /admin ── Admin Dashboard
router.get('/', isAdmin, async (req, res) => {
  try {
    const totalUsers  = await User.countDocuments();
    const totalTrips  = await Trip.countDocuments();
    const recentUsers = await User.find()
      .select('-password')
      .sort('-createdAt')
      .limit(10);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard – Waywise',
      user: req.session.userName,
      role: req.session.role,
      stats: { totalUsers, totalTrips },
      recentUsers
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.redirect('/');
  }
});

// ── GET /admin/users ── All users list
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.render('admin/users', {
      title: 'All Users – Admin',
      user: req.session.userName,
      role: req.session.role,
      users
    });
  } catch (err) {
    res.redirect('/admin');
  }
});

// ── POST /admin/users/:id/delete ── Delete a user
router.post('/users/:id/delete', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/users');
  } catch (err) {
    res.redirect('/admin/users');
  }
});

// ── POST /admin/users/:id/make-admin ── Promote user to admin
router.post('/users/:id/make-admin', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: 'admin' });
    res.redirect('/admin/users');
  } catch (err) {
    res.redirect('/admin/users');
  }
});

module.exports = router;