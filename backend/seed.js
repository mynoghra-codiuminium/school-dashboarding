/**
 * EduSys Production Seed
 * ---------------------
 * Creates ONE admin account using credentials from environment variables.
 * Run once after deploying to MongoDB Atlas:
 *
 *   ADMIN_EMAIL=you@yourschool.edu ADMIN_PASSWORD=YourSecurePass node seed.js
 *
 * Or set these in your Render environment variables and trigger via shell.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');

const ADMIN_NAME     = process.env.ADMIN_NAME     || 'School Administrator';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('\n  ❌  Missing required environment variables.');
  console.error('     Set ADMIN_EMAIL and ADMIN_PASSWORD before running seed.\n');
  process.exit(1);
}

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n  Connected to MongoDB Atlas');

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('\n  ⚠  Admin account already exists for', ADMIN_EMAIL);
    console.log('     Seed skipped — no changes made.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  await User.create({
    name:     ADMIN_NAME,
    email:    ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role:     'admin',
    mustChangePassword: true,
  });

  console.log('\n  ✅  Admin account created:');
  console.log('      Name :', ADMIN_NAME);
  console.log('      Email:', ADMIN_EMAIL);
  console.log('\n  ⚠  You will be prompted to change your password on first login.');
  console.log('     Go to Settings → Security → Change Password immediately.\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('  Seed error:', err.message);
  process.exit(1);
});
