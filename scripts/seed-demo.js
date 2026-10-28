// Fill the DEVELOPMENT database with realistic demo people so dashboards and lists aren't empty.
//   npm run seed:demo          replace the demo people with a fresh set
//   npm run seed:demo:clear    remove only the demo people
//
// Demo people live in MongoDB only. They have no Firebase account, so nobody can sign in as them
// (their firebaseUid starts with "seed_" and can never match a real token). Real users are never touched.
// The same people appear in the frontend's sample payroll data, so every screen tells one story.
import { env } from "../src/config/env.js";
import { connectDB, disconnectDB } from "../src/lib/db.js";
import { User } from "../src/db/models/User.js";

if (env.NODE_ENV === "production") {
  console.error("Refusing to seed demo data with NODE_ENV=production.");
  process.exit(1);
}

const SEED_UID = /^seed_/;
const monthsAgo = (n, day = 12) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n, day);
  return d;
};

const people = [
  { slug: "nadia-rahman", name: "Nadia Rahman", role: "Employee", designation: "Product Designer", salary: 5400, last4: "1190", verified: true, joined: 10 },
  { slug: "james-carter", name: "James Carter", role: "Employee", designation: "Support Lead", salary: 4100, last4: "4821", verified: true, joined: 9 },
  { slug: "rafi-begum", name: "Rafi Begum", role: "Employee", designation: "Research Analyst", salary: 3600, last4: "7734", verified: false, joined: 0 },
  { slug: "daniel-kim", name: "Daniel Kim", role: "Employee", designation: "Sales Executive", salary: 5200, last4: "3305", verified: true, joined: 7 },
  { slug: "tanvir-shah", name: "Tanvir Shah", role: "Employee", designation: "Software Developer", salary: 4750, last4: "9052", verified: false, joined: 0 },
  { slug: "arif-hossain", name: "Arif Hossain", role: "Employee", designation: "Senior Developer", salary: 6250, last4: "2218", verified: true, joined: 8 },
  { slug: "maya-torres", name: "Maya Torres", role: "Employee", designation: "Content Writer", salary: 3800, last4: "6641", verified: true, joined: 5 },
  { slug: "lina-karim", name: "Lina Karim", role: "HR", designation: "HR Manager", salary: 6000, last4: "5502", verified: true, joined: 10 },
  { slug: "omar-farooq", name: "Omar Farooq", role: "HR", designation: "HR Executive", salary: 5000, last4: "8870", verified: true, joined: 6 },
  { slug: "sophie-lane", name: "Sophie Lane", role: "Employee", designation: "Support Agent", salary: 3300, last4: "1043", verified: true, joined: 9, active: false },
];

await connectDB();
const removed = await User.deleteMany({ firebaseUid: SEED_UID });
console.log(`Database "${env.MONGODB_DB}": removed ${removed.deletedCount} existing demo people.`);

if (process.argv.includes("--clear")) {
  await disconnectDB();
  process.exit(0);
}

for (const p of people) {
  const user = new User({
    firebaseUid: `seed_${p.slug}`,
    email: `${p.slug.replace("-", ".")}@paynode.test`, // .test is reserved: can never be a real mailbox
    name: p.name,
    role: p.role,
    designation: p.designation,
    salary: p.salary,
    isVerified: p.verified,
    isActive: p.active ?? true,
    createdAt: monthsAgo(p.joined),
  });
  user.setBankAccount(`500100${p.last4}`); // fake account number
  await user.save();
}

const active = { firebaseUid: SEED_UID, isActive: true };
const [total, verified, hr, inactive] = await Promise.all([
  User.countDocuments(active),
  User.countDocuments({ ...active, isVerified: true }),
  User.countDocuments({ ...active, role: "HR" }),
  User.countDocuments({ firebaseUid: SEED_UID, isActive: false }),
]);
console.log(`Added ${people.length} demo people.`);
console.log(`Dashboard stats will show: ${total} active staff, ${verified} verified, ${total - verified} unverified, ${hr} HR (+ ${inactive} deactivated).`);
await disconnectDB();
