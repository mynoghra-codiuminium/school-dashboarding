const express = require('express');
const { Exam, Fee, Event, Announcement } = require('../models/index');
const { protect } = require('../middleware/auth');

// ── EXAMS ─────────────────────────────────────────────────────
const examRouter = express.Router();
examRouter.use(protect);
examRouter.get('/', async (req, res) => {
  try { res.json(await Exam.find().sort({ date: 1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
examRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Exam.create(req.body)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
examRouter.put('/:id', async (req, res) => {
  try { res.json(await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
examRouter.delete('/:id', async (req, res) => {
  try { await Exam.findByIdAndDelete(req.params.id); res.json({ message: 'Exam deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ── FEES ──────────────────────────────────────────────────────
const feeRouter = express.Router();
feeRouter.use(protect);
feeRouter.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (search) query.student = { $regex: search, $options: 'i' };
    if (status && status !== 'All') query.status = status;
    res.json(await Fee.find(query).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});
feeRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Fee.create(req.body)); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
feeRouter.put('/:id', async (req, res) => {
  try { res.json(await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
feeRouter.delete('/:id', async (req, res) => {
  try { await Fee.findByIdAndDelete(req.params.id); res.json({ message: 'Record deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ── EVENTS ────────────────────────────────────────────────────
const eventRouter = express.Router();
eventRouter.use(protect);
eventRouter.get('/', async (req, res) => {
  try { res.json(await Event.find().sort({ date: 1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
eventRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Event.create({ ...req.body, createdBy: req.user._id })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
eventRouter.put('/:id', async (req, res) => {
  try { res.json(await Event.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
eventRouter.delete('/:id', async (req, res) => {
  try { await Event.findByIdAndDelete(req.params.id); res.json({ message: 'Event deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────────
const annRouter = express.Router();
annRouter.use(protect);
annRouter.get('/', async (req, res) => {
  try { res.json(await Announcement.find().sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
annRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Announcement.create({ ...req.body, createdBy: req.user._id })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
annRouter.put('/:id', async (req, res) => {
  try { res.json(await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
annRouter.delete('/:id', async (req, res) => {
  try { await Announcement.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = { examRouter, feeRouter, eventRouter, annRouter };
