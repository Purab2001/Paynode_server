// Create or promote the first admin. CLI only, never exposed over HTTP.
//   ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" npm run seed:admin
// If the Firebase account is new, a password-setup link is printed instead of storing any password.
import { env } from "../src/config/env.js";
import { connectDB, disconnectDB } from "../src/lib/db.js";
import { getFirebaseAuth } from "../src/lib/firebase.js";
import { User } from "../src/db/models/User.js";

if (!env.ADMIN_EMAIL) {
  console.error("Set ADMIN_EMAIL (and optionally ADMIN_NAME) in backend/.env or the environment.");
  process.exit(1);
}

const auth = getFirebaseAuth();
const email = env.ADMIN_EMAIL.toLowerCase();
const name = env.ADMIN_NAME || "PayNode Admin";

let fbUser;
let created = false;
try {
  fbUser = await auth.getUserByEmail(email);
} catch (err) {
  if (err.code !== "auth/user-not-found") throw err;
  fbUser = await auth.createUser({ email, displayName: name });
  created = true;
}

await auth.setCustomUserClaims(fbUser.uid, { role: "admin" });
await connectDB();
await User.findOneAndUpdate(
  { firebaseUid: fbUser.uid },
  {
    $set: { role: "admin", isVerified: true, isActive: true },
    $setOnInsert: { firebaseUid: fbUser.uid, email, name, designation: "Administrator" },
  },
  { upsert: true, runValidators: true },
);

console.log(`${email} is an admin.`);
if (created) {
  console.log("New account created. Set a password with this link:");
  console.log(await auth.generatePasswordResetLink(email));
}
await disconnectDB();
