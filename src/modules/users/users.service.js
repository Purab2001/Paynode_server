import { User } from "../../db/models/User.js";
import { conflict } from "../../lib/errors.js";
import { syncRoleClaim } from "../../lib/firebase.js";

/** Create the PayNode profile for a freshly signed-up Firebase account. */
export async function createProfile(auth, input) {
  const existing = await User.exists({ $or: [{ firebaseUid: auth.uid }, { email: auth.email }] });
  if (existing) throw conflict("A profile already exists for this account.", "PROFILE_EXISTS");

  const user = new User({
    firebaseUid: auth.uid,
    email: auth.email, // always from the verified token, never the request body
    name: input.name,
    designation: input.designation,
    salary: input.salary,
    photoUrl: input.photoUrl || auth.picture || "",
    role: "Employee",
  });
  user.setBankAccount(input.bankAccount);
  await user.save();
  await syncRoleClaim(auth.uid, user.role);
  return user;
}

export async function updateProfile(user, input) {
  if (input.name !== undefined) user.name = input.name;
  if (input.photoUrl !== undefined) user.photoUrl = input.photoUrl;
  await user.save();
  return user;
}
