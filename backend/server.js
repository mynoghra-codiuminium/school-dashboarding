const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');
require('dotenv').config();

const app = express();

// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(u => u.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    // allow no-origin (mobile apps, curl, etc.) or listed origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── API routes ─────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/students',      require('./routes/students'));
app.use('/api/teachers',      require('./routes/teachers'));
app.use('/api/classes',       require('./routes/classes'));
app.use('/api/exams',         require('./routes/exams'));
app.use('/api/fees',          require('./routes/fees'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/graduation',    require('./routes/graduation'));

const {
  strandRouter, subjectRouter, enrollmentRouter, gradeRouter,
  reportCardRouter, clearanceRouter, immersionRouter, incidentRouter, shsDashRouter,
} = require('./routes/shs');

app.use('/api/shs/strands',     strandRouter);
app.use('/api/shs/subjects',    subjectRouter);
app.use('/api/shs/enrollments', enrollmentRouter);
app.use('/api/shs/grades',      gradeRouter);
app.use('/api/shs/reportcards', reportCardRouter);
app.use('/api/shs/clearances',  clearanceRouter);
app.use('/api/shs/immersions',  immersionRouter);
app.use('/api/shs/incidents',   incidentRouter);
app.use('/api/shs/dashboard',   shsDashRouter);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date() })
);

// ── Serve React build in production (optional — if deploying full-stack on one server) ──
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
}

// ── Error handlers ─────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ── Connect & listen ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
  })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });
