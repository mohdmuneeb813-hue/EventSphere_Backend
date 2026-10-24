/**
 * EventSphere backend seed script.
 *
 * Run with:   npm run seed     (node seed.js)
 *
 * Idempotent: each entity is upserted by a stable key (email for users,
 * title for expos, ticketNumber for bookings, etc.). Re-running the script
 * is safe and won't duplicate records.
 *
 * Data created (if not already present):
 *   - 1 admin:      admin@eventsphere.com    / admin123
 *   - 2 exhibitors: exhibitor@example.com    / exhibitor123  (Neural Systems)
 *                  exhibitor2@example.com   / exhibitor123  (CloudScale Global)
 *   - 2 attendees:  attendee@example.com     / attendee123
 *                  attendee2@example.com    / attendee123
 *   - 3 expos:      "AI & Robotics Summit 2026" — "Future Healthcare Expo 2026" — "Sustainable Cities Expo 2026"
 *   - 5 booths across the expos (mix of Approved / Pending / Rejected)
 *   - 4 sessions across the expos
 *   - 2 bookings (one attendee booked into 2 expos)
 *   - 3 chat messages
 *   - 2 feedback tickets
 *
 * Notes:
 *   - Passwords are hashed with bcrypt (salt rounds = 10) — same cost as the
 *     auth controller, so the credentials above work against the real
 *     /api/auth/login endpoint immediately after seeding.
 *   - Booth numbers follow the A-01 / B-02 / C-03 pattern that the frontend's
 *     FloorPlanView component recognizes (Halls A / B / C, 12 booths per hall).
 *   - The script DOES NOT delete data. If you want a clean slate, drop the
 *     collections manually first: `mongo <uri> --eval "db.users.drop();
 *     db.expos.drop(); db.booths.drop(); db.bookings.drop();
 *     db.schedules.drop(); db.messages.drop(); db.feedbacks.drop();"`
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Expo = require('./models/Expo');
const Booth = require('./models/Booth');
const Booking = require('./models/Booking');
const Schedule = require('./models/Schedule');
const Message = require('./models/Message');
const Feedback = require('./models/Feedback');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Check backend/.env.');
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const upsertUser = async ({ name, email, password, role, companyDetails }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    // Refresh password + role + companyDetails to match the seed definition
    // so the documented credentials always work.
    const salt = await bcrypt.genSalt(10);
    existing.password = await bcrypt.hash(password, salt);
    existing.name = name;
    existing.role = role;
    if (companyDetails) existing.companyDetails = companyDetails;
    await existing.save();
    return existing;
  }
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  return User.create({
    name,
    email,
    password: hashed,
    role,
    companyDetails: companyDetails || (role === 'exhibitor' ? {} : undefined),
  });
};

const upsertExpo = async ({ title, ...rest }) => {
  const existing = await Expo.findOne({ title });
  if (existing) {
    Object.assign(existing, rest);
    await existing.save();
    return existing;
  }
  return Expo.create({ title, ...rest });
};

const upsertBooth = async ({ expo, exhibitor, boothNumber, ...rest }) => {
  const existing = await Booth.findOne({ expo, boothNumber });
  if (existing) {
    Object.assign(existing, { exhibitor, ...rest });
    await existing.save();
    return existing;
  }
  return Booth.create({ expo, exhibitor, boothNumber, ...rest });
};

const upsertSchedule = async ({ expo, sessionTitle, ...rest }) => {
  const existing = await Schedule.findOne({ expo, sessionTitle });
  if (existing) {
    Object.assign(existing, rest);
    await existing.save();
    return existing;
  }
  return Schedule.create({ expo, sessionTitle, ...rest });
};

const upsertBooking = async ({ expo, attendee, ticketNumber }) => {
  const existing = await Booking.findOne({ ticketNumber });
  if (existing) {
    existing.expo = expo;
    existing.attendee = attendee;
    await existing.save();
    return existing;
  }
  return Booking.create({ expo, attendee, ticketNumber });
};

const upsertMessage = async ({ senderId, senderName, text, channel, role }) => {
  // Messages are append-only; don't dedupe by content. If the script is run
  // multiple times, the same payload may stack. To keep this simple, we look
  // for an exact-text message from the same sender within the last hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existing = await Message.findOne({
    senderId,
    text,
    createdAt: { $gte: oneHourAgo },
  });
  if (existing) return existing;
  return Message.create({
    senderId,
    senderName,
    role,
    text,
    channel: channel || 'organizers',
  });
};

const upsertFeedback = async ({ userEmail, subject, ...rest }) => {
  const existing = await Feedback.findOne({ userEmail, subject });
  if (existing) {
    Object.assign(existing, rest);
    await existing.save();
    return existing;
  }
  return Feedback.create({ userEmail, subject, ...rest });
};

// ─── Main ───────────────────────────────────────────────────────────────────

const run = async () => {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI, { autoIndex: true });
  console.log('Connected. Seeding data…\n');

  // 1. Users
  console.log('→ Users…');
  const admin = await upsertUser({
    name: 'Tariq Administrator',
    email: 'admin@eventsphere.com',
    password: 'admin123',
    role: 'admin',
  });

  const exhibitor1 = await upsertUser({
    name: 'Ali Innovations',
    email: 'exhibitor@example.com',
    password: 'exhibitor123',
    role: 'exhibitor',
    companyDetails: {
      companyName: 'Neural Systems Ltd',
      productsOrServices: 'AI & Robotics, Computer Vision, Edge ML hardware',
      description:
        'Neural Systems Ltd designs on-device AI accelerators and robotics control systems for industrial automation.',
      website: 'https://example.com/neural-systems',
      phone: '+971 50 123 4567',
    },
  });

  const exhibitor2 = await upsertUser({
    name: 'Sara Cloudscale',
    email: 'exhibitor2@example.com',
    password: 'exhibitor123',
    role: 'exhibitor',
    companyDetails: {
      companyName: 'CloudScale Global',
      productsOrServices: 'Cloud Infrastructure, Kubernetes Platform, FinOps Tooling',
      description:
        'CloudScale Global provides multi-region Kubernetes platform and FinOps analytics for high-throughput workloads.',
      website: 'https://example.com/cloudscale',
      phone: '+92 21 3456 7890',
    },
  });

  const attendee1 = await upsertUser({
    name: 'Ahmed Attendee',
    email: 'attendee@example.com',
    password: 'attendee123',
    role: 'attendee',
  });

  const attendee2 = await upsertUser({
    name: 'Zoya Khan',
    email: 'attendee2@example.com',
    password: 'attendee123',
    role: 'attendee',
  });

  console.log(`  ✓ ${admin.email} (admin)`);
  console.log(`  ✓ ${exhibitor1.email} (exhibitor)`);
  console.log(`  ✓ ${exhibitor2.email} (exhibitor)`);
  console.log(`  ✓ ${attendee1.email} (attendee)`);
  console.log(`  ✓ ${attendee2.email} (attendee)`);

  // 2. Expos
  console.log('\n→ Expos…');
  const expo1 = await upsertExpo({
    title: 'AI & Robotics Summit 2026',
    description:
      'A 3-day summit focused on industrial AI, edge ML hardware, and robotics control systems. Live demos on the floor, keynotes from leading researchers, and a curated B2B matchmaking lounge.',
    theme: 'Technology & AI',
    location: 'Dubai Exhibition Centre, Dubai, UAE',
    date: new Date('2026-04-22T10:00:00.000Z'),
    createdBy: admin._id,
  });

  const expo2 = await upsertExpo({
    title: 'Future Healthcare Expo 2026',
    description:
      'Bringing together HealthTech startups, biotech labs, hospital networks, and clinicians. Includes a dedicated MedDevice showcase and a regulatory roundtable on cross-border clinical data sharing.',
    theme: 'Healthcare',
    location: 'Expo Centre, Karachi, Pakistan',
    date: new Date('2026-05-18T10:00:00.000Z'),
    createdBy: admin._id,
  });

  const expo3 = await upsertExpo({
    title: 'Sustainable Cities Expo 2026',
    description:
      'Cross-industry expo on sustainable urban infrastructure: renewable energy, green buildings, EV mobility, water systems, and circular-economy startups. Public day on the final Saturday.',
    theme: 'Environment & Climate',
    location: 'Expo Centre, Lahore, Pakistan',
    date: new Date('2026-06-08T10:00:00.000Z'),
    createdBy: admin._id,
  });

  console.log(`  ✓ ${expo1.title}`);
  console.log(`  ✓ ${expo2.title}`);
  console.log(`  ✓ ${expo3.title}`);

  // 3. Booths — mix of statuses, all following the A-01 / B-02 / C-03 pattern.
  console.log('\n→ Booths…');
  const booths = [];
  booths.push(await upsertBooth({
    expo: expo1._id, exhibitor: exhibitor1._id, boothNumber: 'A-01',
    category: 'Tech & AI', status: 'Approved',
  }));
  booths.push(await upsertBooth({
    expo: expo1._id, exhibitor: exhibitor2._id, boothNumber: 'A-04',
    category: 'Software & Cloud', status: 'Pending',
  }));
  booths.push(await upsertBooth({
    expo: expo2._id, exhibitor: exhibitor1._id, boothNumber: 'B-02',
    category: 'HealthTech', status: 'Approved',
  }));
  booths.push(await upsertBooth({
    expo: expo2._id, exhibitor: exhibitor2._id, boothNumber: 'B-08',
    category: 'HealthTech', status: 'Rejected',
  }));
  booths.push(await upsertBooth({
    expo: expo3._id, exhibitor: exhibitor1._id, boothNumber: 'C-05',
    category: 'Hardware & IoT', status: 'Approved',
  }));
  booths.forEach((b) => console.log(`  ✓ Booth ${b.boothNumber} (${b.status}) — ${b.category}`));

  // 4. Schedules — one keynote + one workshop per expo, plus a panel in expo1.
  console.log('\n→ Schedules…');
  const sessions = [];
  sessions.push(await upsertSchedule({
    expo: expo1._id,
    sessionTitle: 'Keynote: On-Device AI at the Edge',
    speaker: 'Dr. Reem Hadid',
    topic: 'Artificial Intelligence',
    timeSlot: '10:00 AM - 11:00 AM',
    location: 'Auditorium Hall A',
  }));
  sessions.push(await upsertSchedule({
    expo: expo1._id,
    sessionTitle: 'Workshop: Building Your First Robotics Stack',
    speaker: 'Faraz Mehmood',
    topic: 'Robotics',
    timeSlot: '01:00 PM - 02:30 PM',
    location: 'Workshop Room 2',
  }));
  sessions.push(await upsertSchedule({
    expo: expo1._id,
    sessionTitle: 'Panel: Cross-Industry AI Adoption',
    speaker: 'Panel — Moderated by Dr. Reem Hadid',
    topic: 'Industry Roundtable',
    timeSlot: '03:00 PM - 04:00 PM',
    location: 'Auditorium Hall A',
  }));
  sessions.push(await upsertSchedule({
    expo: expo2._id,
    sessionTitle: 'Keynote: The Next Decade of Biotech',
    speaker: 'Dr. Anjali Verma',
    topic: 'Biotech',
    timeSlot: '10:00 AM - 11:00 AM',
    location: 'Auditorium Hall B',
  }));
  sessions.push(await upsertSchedule({
    expo: expo2._id,
    sessionTitle: 'Workshop: Regulatory Pathways for Medical Devices',
    speaker: 'Dr. Imran Sheikh',
    topic: 'Regulatory',
    timeSlot: '11:30 AM - 12:30 PM',
    location: 'Workshop Room 1',
  }));
  sessions.push(await upsertSchedule({
    expo: expo3._id,
    sessionTitle: 'Keynote: Designing for Net-Zero Cities',
    speaker: 'Architect Layla Rahman',
    topic: 'Sustainable Architecture',
    timeSlot: '10:00 AM - 11:00 AM',
    location: 'Auditorium Hall C',
  }));
  sessions.forEach((s) => console.log(`  ✓ ${s.sessionTitle}`));

  // Pre-bookmark both attendees on a couple of sessions so the SessionBookmarks
  // page has real data to show after a fresh seed.
  const bookmarkPairs = [
    [sessions[0]._id, attendee1._id],
    [sessions[1]._id, attendee1._id],
    [sessions[0]._id, attendee2._id],
    [sessions[3]._id, attendee2._id],
  ];
  for (const [scheduleId, userId] of bookmarkPairs) {
    const sched = await Schedule.findById(scheduleId);
    if (sched && !sched.attendees.some((a) => a.toString() === userId.toString())) {
      sched.attendees.push(userId);
      await sched.save();
    }
  }
  console.log(`  ✓ ${bookmarkPairs.length} attendee bookmarks applied`);

  // 5. Bookings — one attendee books into 2 expos, another into 1 expo.
  console.log('\n→ Bookings…');
  const bookings = [];
  bookings.push(await upsertBooking({
    expo: expo1._id, attendee: attendee1._id, ticketNumber: 'TICK-100001',
  }));
  bookings.push(await upsertBooking({
    expo: expo2._id, attendee: attendee1._id, ticketNumber: 'TICK-100002',
  }));
  bookings.push(await upsertBooking({
    expo: expo1._id, attendee: attendee2._id, ticketNumber: 'TICK-100003',
  }));
  bookings.forEach((b) => console.log(`  ✓ ${b.ticketNumber}`));

  // 6. Messages — a welcome from admin, plus 2 exhibitor replies.
  console.log('\n→ Messages…');
  await upsertMessage({
    senderId: admin._id.toString(),
    senderName: 'EventSphere Organizer Desk',
    role: 'admin',
    text: 'Welcome exhibitors! Technical staff are available in Hall A and Hall B for electrical or booth assistance.',
    channel: 'organizers',
  });
  await upsertMessage({
    senderId: exhibitor1._id.toString(),
    senderName: 'Neural Systems Ltd',
    role: 'exhibitor',
    text: 'Hi team, do we have access to the demo-room projector for the 2:30 PM robotics workshop?',
    channel: 'organizers',
  });
  await upsertMessage({
    senderId: exhibitor2._id.toString(),
    senderName: 'CloudScale Global',
    role: 'exhibitor',
    text: 'Confirmed booth A-04 setup. We will be bringing our own 4K display panels.',
    channel: 'booth_neighbors',
  });
  console.log('  ✓ 3 seed messages inserted');

  // 7. Feedback — one Booth Issue (Open), one general Feedback (Resolved).
  console.log('\n→ Feedback…');
  await upsertFeedback({
    category: 'Booth Issue',
    subject: 'Power outlet at Booth A-04 not working',
    message: 'The dedicated 220V outlet at Booth A-04 trips when we plug in our display. Requesting an electrician before the public opening.',
    userName: 'Sara Cloudscale',
    userEmail: 'exhibitor2@example.com',
    role: 'exhibitor',
    status: 'Open',
  });
  await upsertFeedback({
    category: 'Feedback',
    subject: 'Loved the interactive floor plan on the attendee portal',
    message: 'The new interactive floor plan made it really easy to find the AI keynote hall. Would love to see offline cached bookmarks next.',
    userName: 'Ahmed Attendee',
    userEmail: 'attendee@example.com',
    role: 'attendee',
    status: 'Resolved',
  });
  console.log('  ✓ 2 feedback tickets inserted');

  console.log('\n✅ Seed complete.');
  console.log('\nDemo credentials (passwords shown for the seeded accounts only):');
  console.log('  Admin:      admin@eventsphere.com     / admin123');
  console.log('  Exhibitor:  exhibitor@example.com     / exhibitor123');
  console.log('  Exhibitor2: exhibitor2@example.com    / exhibitor123');
  console.log('  Attendee:   attendee@example.com      / attendee123');
  console.log('  Attendee2:  attendee2@example.com    / attendee123');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  if (mongoose.connection.readyState === 1) {
    mongoose.disconnect().finally(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
