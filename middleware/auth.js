// Middleware: block access if user is not logged in
const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl; // remember where they were going
  res.redirect('/auth/login');
};

// Middleware: block access if user is not logged in for JSON/API routes
const isApiLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Login required' });
};

// Middleware: block access if user is not admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  res.status(403).render('error', {
    message: 'Access denied. Admins only.',
    user: req.session.userName || null
  });
};

// Middleware: redirect logged-in users away from login/signup pages
const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
};

module.exports = { isLoggedIn, isApiLoggedIn, isAdmin, isGuest };