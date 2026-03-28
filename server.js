const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Atlas connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thelastten';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/game');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/game');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/game');
  }
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/game', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// API: Signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username min 3 chars, password min 6 chars' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      password: hashedPassword
    });
    
    await user.save();
    
    req.session.userId = user._id;
    req.session.username = username;
    res.json({ success: true, username });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user._id;
    req.session.username = user.username;
    res.json({ success: true, username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// API: Get current user
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ id: req.session.userId, username: req.session.username });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
