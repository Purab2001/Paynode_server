import { Payment } from "../../db/models/Payment.js";
import { PayrollRequest } from "../../db/models/PayrollRequest.js";

const toCents = (amount) => Math.round(amount * 100);

/**
 * Turn a succeeded Stripe PaymentIntent into a paid request and a Payment record.
 * Safe to call any number of times for the same intent (Stripe retries webhooks).
 * Returns what happened so the caller can log it.
 */
export async function recordSucceededIntent(intent) {
  const payrollId = intent.metadata?.payrollId;
  if (!payrollId) return "ignored"; // not one of ours

  const request = await PayrollRequest.findById(payrollId);
  if (!request) return "unknown-request";
  if (intent.currency !== "usd" || intent.amount_received !== toCents(request.amount)) return "amount-mismatch";

  // Claim the request. Only one delivery wins the pending -> paid transition.
  const paidAt = new Date(intent.created * 1000);
  await PayrollRequest.updateOne(
    { _id: request._id, status: "pending" },
    { status: "paid", paidAt, decidedAt: new Date(), paymentIntentId: intent.id },
  );

  const current = await PayrollRequest.findById(request._id);
  if (current.status !== "paid" || current.paymentIntentId !== intent.id) return "not-payable"; // rejected, or paid by another intent

  // Upsert so a retry after a partial failure still creates the record.
  await Payment.updateOne(
    { transactionId: intent.id },
    {
      $setOnInsert: {
        employee: request.employee,
        payrollRequest: request._id,
        amount: request.amount,
        period: request.period,
        transactionId: intent.id,
        paidAt,
      },
    },
    { upsert: true },
  );
  return "recorded";
}

const paging = (page, limit, total) => ({ page, pages: Math.max(1, Math.ceil(total / limit)) });

export async function list({ employee, page, limit }) {
  const filter = employee ? { employee } : {};
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ "period.year": -1, "period.month": -1 }).skip((page - 1) * limit).limit(limit).populate("employee", "name email photoUrl"),
    Payment.countDocuments(filter),
  ]);
  return { items, total, ...paging(page, limit, total) };
}

export async function listMine(viewer, { page, limit }) {
  const filter = { employee: viewer._id };
  const newestFirst = { "period.year": -1, "period.month": -1 };
  const [items, total, sums, last] = await Promise.all([
    Payment.find(filter).sort(newestFirst).skip((page - 1) * limit).limit(limit),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $match: filter }, { $group: { _id: null, totalPaid: { $sum: "$amount" } } }]),
    Payment.findOne(filter).sort(newestFirst),
  ]);
  return { items, total, summary: { totalPaid: sums[0]?.totalPaid ?? 0, last }, ...paging(page, limit, total) };
}
