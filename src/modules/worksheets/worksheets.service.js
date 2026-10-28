import { Worksheet } from "../../db/models/Worksheet.js";
import { User } from "../../db/models/User.js";
import { audit } from "../../db/models/AuditLog.js";
import { forbidden, notFound, unprocessable } from "../../lib/errors.js";
import { pageInfo } from "../../lib/pagination.js";

const DAY_MS = 86_400_000;
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const toDay = (d) => d.toISOString().slice(0, 10);
const todayUtc = () => toDay(new Date());

function assertNotFuture(date) {
  // One day of slack so someone ahead of UTC can still log "today".
  if (toDate(date).getTime() > toDate(todayUtc()).getTime() + DAY_MS) {
    throw unprocessable("You can't log time for a future date.", "FUTURE_DATE");
  }
}

const sum = (rows) => rows.reduce((total, r) => total + r.hours, 0);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Own entry that is still editable. Approved entries are locked. */
async function findOwn(id, viewer) {
  const entry = await Worksheet.findOne({ _id: id, user: viewer._id });
  if (!entry) throw notFound("Entry not found.");
  if (entry.status === "approved") throw forbidden("Approved entries can't be changed.", "ENTRY_LOCKED");
  return entry;
}

export async function listMine(viewer, { from, to, page, limit }) {
  const filter = { user: viewer._id };
  if (from || to) filter.date = { ...(from && { $gte: toDate(from) }), ...(to && { $lte: toDate(to) }) };

  const [items, total, hours] = await Promise.all([
    Worksheet.find(filter).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Worksheet.countDocuments(filter),
    Worksheet.aggregate([{ $match: filter }, { $group: { _id: null, hours: { $sum: "$hours" } } }]),
  ]);
  return { items, totalHours: hours[0]?.hours ?? 0, ...pageInfo(total, page, limit) };
}

/**
 * Hours for Mon–Fri of the current week plus month totals, relative to the caller's local "today".
 * One grouped query: a row per day that has entries.
 */
export async function summary(viewer, { today = todayUtc() }) {
  const now = toDate(today);
  const monday = new Date(now.getTime() - ((now.getUTCDay() + 6) % 7) * DAY_MS);
  const nextMonday = new Date(monday.getTime() + 7 * DAY_MS);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  // The week can straddle two months, so cover the union of both ranges.
  const days = await Worksheet.aggregate([
    { $match: { user: viewer._id, date: { $gte: new Date(Math.min(monthStart, monday)), $lt: new Date(Math.max(nextMonth, nextMonday)) } } },
    { $group: { _id: "$date", hours: { $sum: "$hours" }, entries: { $sum: 1 } } },
  ]);

  const inRange = (from, to) => days.filter((d) => d._id >= from && d._id < to);
  const monthDays = inRange(monthStart, nextMonth);
  const week = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday.getTime() + i * DAY_MS);
    return { date: toDay(date), hours: days.find((d) => +d._id === +date)?.hours ?? 0 };
  });
  return {
    week,
    weekHours: sum(inRange(monday, nextMonday)),
    monthHours: sum(monthDays),
    monthEntries: monthDays.reduce((total, d) => total + d.entries, 0),
    daysLogged: monthDays.length,
  };
}

export async function create(viewer, { date, ...body }) {
  assertNotFuture(date);
  return Worksheet.create({ ...body, date: toDate(date), user: viewer._id });
}

export async function update(id, viewer, { date, ...body }) {
  const entry = await findOwn(id, viewer);
  if (date) {
    assertNotFuture(date);
    entry.date = toDate(date);
  }
  entry.set(body);
  // Editing a rejected entry puts it back in the review queue.
  entry.status = "submitted";
  entry.reviewedBy = undefined;
  entry.reviewedAt = undefined;
  return entry.save();
}

export async function remove(id, viewer) {
  const entry = await findOwn(id, viewer);
  await entry.deleteOne();
}

export async function listTeam({ employee, q, month, task, status, page, limit }) {
  const filter = {};
  if (employee) filter.user = employee;
  if (q) {
    // Match by name so the filter works for any number of employees, deactivated ones included.
    const people = await User.find({ role: "Employee", name: new RegExp(escapeRegex(q), "i") }).select("_id").limit(200);
    const ids = people.map((p) => p._id);
    filter.user = { $in: employee ? ids.filter((id) => String(id) === employee) : ids };
  }
  if (task) filter.task = task;
  if (status) filter.status = status;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    filter.date = { $gte: new Date(Date.UTC(y, m - 1, 1)), $lt: new Date(Date.UTC(y, m, 1)) };
  }

  const [items, total, hours] = await Promise.all([
    Worksheet.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email photoUrl"),
    Worksheet.countDocuments(filter),
    Worksheet.aggregate([{ $match: filter }, { $group: { _id: null, hours: { $sum: "$hours" } } }]),
  ]);
  return { items, totalHours: hours[0]?.hours ?? 0, ...pageInfo(total, page, limit) };
}

export async function review(id, status, actor) {
  const entry = await Worksheet.findById(id).populate("user", "name email photoUrl");
  if (!entry) throw notFound("Entry not found.");
  if (entry.status === status) return entry;
  await audit(actor, `worksheet.${status === "approved" ? "approve" : "reject"}`, entry.user, entry.status, status);
  entry.status = status;
  entry.reviewedBy = actor._id;
  entry.reviewedAt = new Date();
  return entry.save();
}
