import { User } from "../../db/models/User.js";
import { audit } from "../../db/models/AuditLog.js";
import { forbidden, notFound, unprocessable } from "../../lib/errors.js";
import { getFirebaseAuth, syncRoleClaim } from "../../lib/firebase.js";
import { disconnectFromChat } from "../../lib/realtime.js";

// HR manages Employees; admins manage Employees and HR. Nobody manages admins through the API.
const manageableRoles = (viewer) => (viewer.role === "admin" ? ["Employee", "HR"] : ["Employee"]);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findManageable(id, viewer) {
  const user = await User.findOne({ _id: id, role: { $in: manageableRoles(viewer) } });
  if (!user) throw notFound("Employee not found.");
  return user;
}

export async function list(viewer, { q, role, status, verified, page, limit }) {
  const roles = manageableRoles(viewer);
  const filter = { role: role && roles.includes(role) ? role : { $in: roles } };

  // HR only ever sees active people.
  const effectiveStatus = viewer.role === "admin" ? status : "active";
  if (effectiveStatus !== "all") filter.isActive = effectiveStatus === "active";
  if (verified !== undefined) filter.isVerified = verified;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }, { designation: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function stats(viewer) {
  const base = { role: { $in: manageableRoles(viewer) }, isActive: true };
  const [total, verified, hr] = await Promise.all([
    User.countDocuments(base),
    User.countDocuments({ ...base, isVerified: true }),
    viewer.role === "admin" ? User.countDocuments({ role: "HR", isActive: true }) : 0,
  ]);
  return { total, verified, unverified: total - verified, ...(viewer.role === "admin" && { hr }) };
}

export const get = (id, viewer) => findManageable(id, viewer);

export async function setVerification(id, isVerified, actor) {
  const user = await findManageable(id, actor);
  if (user.isVerified === isVerified) return user;
  await audit(actor, "verification.change", user, user.isVerified, isVerified);
  user.isVerified = isVerified;
  return user.save();
}

export async function setRole(id, role, actor) {
  const user = await findManageable(id, actor);
  if (user.id === actor.id) throw forbidden("You can't change your own role.");
  if (user.role === role) return user;
  await audit(actor, "role.change", user, user.role, role);
  user.role = role;
  await user.save();
  await syncRoleClaim(user.firebaseUid, role);
  return user;
}

export async function raiseSalary(id, salary, actor) {
  const user = await findManageable(id, actor);
  if (!(salary > user.salary)) {
    throw unprocessable(`New salary must be higher than the current ${user.salary}.`, "SALARY_NOT_INCREASED");
  }
  await audit(actor, "salary.change", user, user.salary, salary);
  user.salary = salary;
  return user.save();
}

export async function setStatus(id, isActive, actor) {
  const user = await findManageable(id, actor);
  if (user.id === actor.id) throw forbidden("You can't deactivate your own account.");
  if (user.isActive === isActive) return user;
  await audit(actor, isActive ? "access.restore" : "access.revoke", user, user.isActive, isActive);
  user.isActive = isActive;
  await user.save();
  if (!isActive) {
    // Sign them out everywhere. The isActive check in authenticate() blocks any token still in flight.
    await getFirebaseAuth().revokeRefreshTokens(user.firebaseUid).catch((err) => {
      console.warn(`Could not revoke tokens for ${user.id}:`, err.message);
    });
    await disconnectFromChat(user.id);
  }
  return user;
}
