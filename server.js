const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Database setup
const db = new sqlite3.Database('./users.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
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
    
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
      [username, hashedPassword], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        req.session.userId = this.lastID;
        req.session.username = username;
        res.json({ success: true, username });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, username: user.username });
  });
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
