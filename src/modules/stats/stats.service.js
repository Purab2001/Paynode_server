import mongoose from "mongoose";
import { Worksheet } from "../../db/models/Worksheet.js";
import { PayrollRequest } from "../../db/models/PayrollRequest.js";
import { Payment } from "../../db/models/Payment.js";
import { AuditLog } from "../../db/models/AuditLog.js";
import { summary as worksheetSummary } from "../worksheets/worksheets.service.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const usd = (n) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const toDate = (s) => new Date(`${s}T00:00:00Z`);

/** Everything the Employee dashboard and overview show, for the month containing the caller's "today". */
export async function employeeStats(viewer, { today = new Date().toISOString().slice(0, 10) }) {
  const now = toDate(today);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const inMonth = { user: viewer._id, date: { $gte: monthStart, $lt: nextMonth } };

  const [base, byTask, latest, lastPayment] = await Promise.all([
    worksheetSummary(viewer, { today }),
    Worksheet.aggregate([{ $match: inMonth }, { $group: { _id: "$task", hours: { $sum: "$hours" } } }, { $sort: { hours: -1 } }]),
    Worksheet.find({ user: viewer._id }).sort({ date: -1, createdAt: -1 }).limit(3),
    Payment.findOne({ employee: viewer._id }).sort({ "period.year": -1, "period.month": -1 }),
  ]);

  return {
    ...base,
    avgPerEntry: base.monthEntries ? base.monthHours / base.monthEntries : 0,
    avgPerDay: base.daysLogged ? base.monthHours / base.daysLogged : 0,
    taskDistribution: byTask.map((t) => ({ label: t._id, value: t.hours })),
    latestEntries: latest,
    lastPayment,
  };
}

const blankTotals = () => ({ pending: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 } });

async function totalsByStatus(match) {
  const rows = await PayrollRequest.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }]);
  const totals = blankTotals();
  for (const r of rows) totals[r._id] = { count: r.count, amount: r.amount };
  return totals;
}

/**
 * Payroll numbers for HR (their own requests) and admins (everything).
 * "This month" is the caller's own current month (year/month from the browser), so the figures match the label they show.
 */
export async function payrollStats(viewer, { year: y, month: m } = {}) {
  const scope = viewer.role === "HR" ? { requestedBy: new mongoose.Types.ObjectId(viewer.id) } : {};
  const now = new Date();
  const year = y ?? now.getUTCFullYear();
  const month = m ?? now.getUTCMonth() + 1;

  // Twelve months ending now, oldest first, including months with nothing in them.
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (11 - i), 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  });
  const first = months[0];

  const [trendRows, all, thisMonth] = await Promise.all([
    PayrollRequest.aggregate([
      { $match: { ...scope, status: { $ne: "rejected" }, $or: [{ "period.year": { $gt: first.year } }, { "period.year": first.year, "period.month": { $gte: first.month } }] } },
      {
        $group: {
          _id: { year: "$period.year", month: "$period.month" },
          requested: { $sum: "$amount" },
          paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
        },
      },
    ]),
    totalsByStatus(scope),
    totalsByStatus({ ...scope, "period.year": year, "period.month": month }),
  ]);

  const trend = months.map((m) => {
    const row = trendRows.find((r) => r._id.year === m.year && r._id.month === m.month);
    return { ...m, requested: row?.requested ?? 0, paid: row?.paid ?? 0 };
  });
  return { period: { year, month }, trend, all, thisMonth, pending: all.pending };
}

const when = (d) => new Date(d).toISOString();

/** Admin activity feed: audit entries and confirmed payments, newest first. */
export async function activity(limit = 10) {
  const [logs, payments] = await Promise.all([
    AuditLog.find({ action: { $in: ["verification.change", "role.change", "salary.change", "access.revoke", "access.restore", "payroll.reject"] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", "name")
      .populate("target", "name"),
    Payment.find().sort({ paidAt: -1 }).limit(limit).populate("employee", "name"),
  ]);

  const fromLog = logs.map((l) => {
    const who = l.target?.name ?? "A former employee";
    const base = { id: String(l._id), detail: `By ${l.actor?.name ?? "an admin"}`, at: when(l.createdAt) };
    switch (l.action) {
      case "verification.change":
        return { ...base, kind: "Verified", tone: l.to ? "ok" : "warn", text: l.to ? `${who} was verified` : `Verification removed for ${who}` };
      case "role.change":
        return { ...base, kind: "Role", tone: "brand", text: `${who} was changed from ${l.from} to ${l.to}` };
      case "salary.change":
        return { ...base, kind: "Salary", tone: "warn", text: `${who}'s salary changed from ${usd(l.from)} to ${usd(l.to)}` };
      case "access.revoke":
        return { ...base, kind: "Access", tone: "bad", text: `${who}'s account was deactivated` };
      case "access.restore":
        return { ...base, kind: "Access", tone: "ok", text: `${who}'s account was restored` };
      default:
        return { ...base, kind: "Request", tone: "bad", text: `Pay request for ${who} was rejected` };
    }
  });
  const fromPayments = payments.map((p) => ({
    id: String(p._id),
    kind: "Paid",
    tone: "ok",
    text: `${p.employee?.name ?? "A former employee"} was paid ${usd(p.amount)} for ${MONTHS[p.period.month - 1]}`,
    detail: `Stripe ${p.transactionId}`,
    at: when(p.paidAt),
  }));

  return [...fromLog, ...fromPayments].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
