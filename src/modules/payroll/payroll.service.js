import mongoose from "mongoose";
import { PayrollRequest } from "../../db/models/PayrollRequest.js";
import { User } from "../../db/models/User.js";
import { audit } from "../../db/models/AuditLog.js";
import { conflict, notFound, unprocessable } from "../../lib/errors.js";
import { pageInfo } from "../../lib/pagination.js";
import { getStripe } from "../../lib/stripe.js";

const PEOPLE = "name email photoUrl";
const populate = (query) => query.populate("employee", PEOPLE).populate("requestedBy", "name");

export async function create(actor, { employeeId, year, month }) {
  const employee = await User.findOne({ _id: employeeId, role: "Employee", isActive: true });
  if (!employee) throw notFound("Employee not found.");
  if (!employee.isVerified) throw unprocessable("Verify this employee before requesting pay.", "NOT_VERIFIED");
  if (!(employee.salary > 0)) throw unprocessable("This employee has no salary on record.", "NO_SALARY");

  const now = new Date();
  if (year * 12 + month > now.getUTCFullYear() * 12 + now.getUTCMonth() + 1) {
    throw unprocessable("You can't request pay for a month that hasn't started.", "FUTURE_PERIOD");
  }

  const duplicate = () => conflict(`${employee.name} already has a request for that month.`, "PAYROLL_DUPLICATE");
  if (await PayrollRequest.exists({ employee: employee._id, "period.year": year, "period.month": month, status: { $in: ["pending", "paid"] } })) {
    throw duplicate();
  }
  try {
    const request = await PayrollRequest.create({
      employee: employee._id,
      amount: employee.salary,
      period: { year, month },
      requestedBy: actor._id,
    });
    return await populate(PayrollRequest.findById(request._id));
  } catch (err) {
    if (err.code === 11000) throw duplicate(); // lost a race with the same request
    throw err;
  }
}

export async function list(viewer, { status, employee, page, limit }) {
  const scope = {};
  if (viewer.role === "HR") scope.requestedBy = viewer._id; // HR sees only what they asked for
  if (employee) scope.employee = employee;
  const filter = status ? { ...scope, status } : scope;

  const [items, total, counts] = await Promise.all([
    populate(PayrollRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
    PayrollRequest.countDocuments(filter),
    // Tab badges ignore the status filter but respect the rest. aggregate() doesn't cast ids, so do it here.
    PayrollRequest.aggregate([
      { $match: Object.fromEntries(Object.entries(scope).map(([k, v]) => [k, typeof v === "string" ? new mongoose.Types.ObjectId(v) : v])) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  return {
    items,
    counts: Object.fromEntries(["pending", "paid", "rejected"].map((s) => [s, counts.find((c) => c._id === s)?.count ?? 0])),
    ...pageInfo(total, page, limit),
  };
}

export async function get(id) {
  const request = await populate(PayrollRequest.findById(id));
  if (!request) throw notFound("Payroll request not found.");
  return request;
}

const OPEN_INTENT = ["requires_payment_method", "requires_confirmation", "requires_action"];
const toCents = (amount) => Math.round(amount * 100);

/**
 * Start (or resume) the Stripe payment for a pending request. The amount comes from the stored
 * request, never from the client. The request only becomes "paid" when Stripe's webhook says so.
 */
export async function createPaymentIntent(id) {
  const request = await PayrollRequest.findById(id).populate("employee", "name email");
  if (!request) throw notFound("Payroll request not found.");
  if (request.status !== "pending") throw conflict(`This request is already ${request.status}.`, "PAYROLL_NOT_PENDING");

  const stripe = getStripe();
  if (request.paymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(request.paymentIntentId);
    if (OPEN_INTENT.includes(existing.status)) return { clientSecret: existing.client_secret, amount: request.amount };
    if (existing.status === "succeeded" || existing.status === "processing") {
      throw conflict("This payment is already going through. Refresh in a moment.", "PAYMENT_IN_PROGRESS");
    }
  }

  const intent = await stripe.paymentIntents.create({
    amount: toCents(request.amount),
    currency: "usd",
    // Card only: the Payment Element confirms in place. Redirect-based methods would need a return_url.
    payment_method_types: ["card"],
    description: `Salary ${request.period.month}/${request.period.year} for ${request.employee.name}`,
    metadata: { payrollId: String(request._id) },
  });
  await PayrollRequest.updateOne({ _id: request._id, status: "pending" }, { paymentIntentId: intent.id });
  return { clientSecret: intent.client_secret, amount: request.amount };
}

export async function reject(id, reason, actor) {
  const request = await PayrollRequest.findById(id);
  if (!request) throw notFound("Payroll request not found.");
  if (request.status !== "pending") throw conflict(`This request is already ${request.status}.`, "PAYROLL_NOT_PENDING");

  // Never leave a live payment behind a rejected request.
  if (request.paymentIntentId) {
    try {
      await getStripe().paymentIntents.cancel(request.paymentIntentId);
    } catch {
      throw conflict("A payment for this request is already going through, so it can't be rejected.", "PAYMENT_IN_PROGRESS");
    }
  }

  await audit(actor, "payroll.reject", { _id: request.employee }, request.status, "rejected");
  Object.assign(request, { status: "rejected", rejectReason: reason || undefined, decidedBy: actor._id, decidedAt: new Date() });
  await request.save();
  return get(id);
}
