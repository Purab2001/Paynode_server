import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { bearer, firebaseMock, seedUser } from "./helpers.js";

vi.mock("../src/lib/firebase.js", () => firebaseMock);

// Real Stripe client so webhook signature checking is the genuine article; only the network calls are stubbed.
const stripe = vi.hoisted(() => ({ client: null }));
vi.mock("../src/lib/stripe.js", async () => {
  const { default: Stripe } = await import("stripe");
  stripe.client = new Stripe("sk_test_dummy");
  stripe.client.paymentIntents = { create: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() };
  return { getStripe: () => stripe.client };
});

const { default: app } = await import("../src/app.js");
const { connectDB, disconnectDB } = await import("../src/lib/db.js");
const { User } = await import("../src/db/models/User.js");
const { PayrollRequest } = await import("../src/db/models/PayrollRequest.js");
const { Payment } = await import("../src/db/models/Payment.js");
const { AuditLog } = await import("../src/db/models/AuditLog.js");

const SECRET = "whsec_test_secret";
const now = new Date();
const period = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

let ann, hr, req1;

/** Send a Stripe-signed event to the webhook. */
function webhook(event, { secret = SECRET } = {}) {
  const payload = JSON.stringify(event);
  const header = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload, secret });
  return request(app).post("/api/stripe/webhook").set("Content-Type", "application/json").set("Stripe-Signature", header).send(payload);
}

const succeeded = (overrides = {}) => ({
  id: "evt_1",
  type: "payment_intent.succeeded",
  data: {
    object: {
      id: "pi_123",
      currency: "usd",
      amount_received: 540000,
      created: 1_790_000_000,
      metadata: { payrollId: String(req1._id) },
      ...overrides,
    },
  },
});

beforeAll(async () => {
  await connectDB();
  await Promise.all([PayrollRequest.init(), Payment.init()]);
});
afterAll(() => disconnectDB());
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), PayrollRequest.deleteMany({}), Payment.deleteMany({}), AuditLog.deleteMany({})]);
  vi.clearAllMocks();
  ann = await seedUser(User, { uid: "ann", name: "Ann Lee", salary: 5400, isVerified: true });
  hr = await seedUser(User, { uid: "hr1", role: "HR" });
  await seedUser(User, { uid: "root", role: "admin" });
  req1 = await PayrollRequest.create({ employee: ann._id, amount: 5400, period, requestedBy: hr._id });
  stripe.client.paymentIntents.create.mockResolvedValue({ id: "pi_123", client_secret: "pi_123_secret", status: "requires_payment_method" });
});

describe("payment intents", () => {
  const intent = (as) => request(app).post(`/api/payroll/${req1.id}/payment-intent`).set(bearer(as));

  it("charges the stored amount in cents and is admin only", async () => {
    expect((await intent("hr1")).status).toBe(403);
    expect((await intent("ann")).status).toBe(403);

    const res = await intent("root");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ clientSecret: "pi_123_secret", amount: 5400 });
    expect(stripe.client.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 540000, currency: "usd", payment_method_types: ["card"], metadata: { payrollId: String(req1._id) } }),
    );
  });

  it("resumes an open intent instead of creating a second one", async () => {
    await intent("root");
    stripe.client.paymentIntents.retrieve.mockResolvedValue({ id: "pi_123", client_secret: "pi_123_secret", status: "requires_payment_method" });
    const again = await intent("root");
    expect(again.body.clientSecret).toBe("pi_123_secret");
    expect(stripe.client.paymentIntents.create).toHaveBeenCalledTimes(1);
  });

  it("refuses requests that are no longer pending", async () => {
    await PayrollRequest.updateOne({ _id: req1._id }, { status: "rejected" });
    const res = await intent("root");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYROLL_NOT_PENDING");
  });
});

describe("stripe webhook", () => {
  beforeEach(async () => {
    await PayrollRequest.updateOne({ _id: req1._id }, { paymentIntentId: "pi_123" });
  });

  it("rejects missing or forged signatures", async () => {
    const bad = await webhook(succeeded(), { secret: "whsec_wrong" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_SIGNATURE");
    expect((await request(app).post("/api/stripe/webhook").set("Content-Type", "application/json").send("{}")).status).toBe(400);
    expect((await PayrollRequest.findById(req1._id)).status).toBe("pending");
  });

  it("marks the request paid and records one payment, even when Stripe retries", async () => {
    expect((await webhook(succeeded())).status).toBe(200);
    expect((await webhook(succeeded())).status).toBe(200);

    const paid = await PayrollRequest.findById(req1._id);
    expect(paid.status).toBe("paid");
    expect(await Payment.countDocuments()).toBe(1);
    const payment = await Payment.findOne();
    expect(payment).toMatchObject({ amount: 5400, transactionId: "pi_123", period });
    expect(String(payment.employee)).toBe(ann.id);
  });

  it("ignores a payment whose amount doesn't match the request", async () => {
    await webhook(succeeded({ amount_received: 100 }));
    expect((await PayrollRequest.findById(req1._id)).status).toBe("pending");
    expect(await Payment.countDocuments()).toBe(0);
  });

  it("ignores events that aren't ours", async () => {
    expect((await webhook(succeeded({ metadata: {} }))).status).toBe(200);
    expect((await webhook({ id: "evt_2", type: "charge.refunded", data: { object: {} } })).status).toBe(200);
    expect(await Payment.countDocuments()).toBe(0);
  });

  it("does not pay a request that was rejected meanwhile", async () => {
    await PayrollRequest.updateOne({ _id: req1._id }, { status: "rejected" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await webhook(succeeded());
    expect((await PayrollRequest.findById(req1._id)).status).toBe("rejected");
    expect(await Payment.countDocuments()).toBe(0);
    expect(spy).toHaveBeenCalled(); // flagged for reconciliation
    spy.mockRestore();
  });
});

describe("rejecting a request with a live payment", () => {
  it("cancels the Stripe intent first", async () => {
    await PayrollRequest.updateOne({ _id: req1._id }, { paymentIntentId: "pi_123" });
    stripe.client.paymentIntents.cancel.mockResolvedValue({});
    const res = await request(app).patch(`/api/payroll/${req1.id}/reject`).set(bearer("root")).send({});
    expect(res.status).toBe(200);
    expect(stripe.client.paymentIntents.cancel).toHaveBeenCalledWith("pi_123");
  });

  it("refuses when the intent can't be cancelled (already paying)", async () => {
    await PayrollRequest.updateOne({ _id: req1._id }, { paymentIntentId: "pi_123" });
    stripe.client.paymentIntents.cancel.mockRejectedValue(new Error("already succeeded"));
    const res = await request(app).patch(`/api/payroll/${req1.id}/reject`).set(bearer("root")).send({});
    expect(res.status).toBe(409);
    expect((await PayrollRequest.findById(req1._id)).status).toBe("pending");
  });
});

describe("payment history", () => {
  beforeEach(async () => {
    const other = await seedUser(User, { uid: "bea", name: "Bea", isVerified: true });
    await Payment.create([
      { employee: ann._id, payrollRequest: req1._id, amount: 5400, period: { year: 2026, month: 9 }, transactionId: "pi_a", paidAt: new Date() },
      { employee: ann._id, payrollRequest: new PayrollRequest()._id, amount: 5400, period: { year: 2026, month: 10 }, transactionId: "pi_b", paidAt: new Date() },
      { employee: other._id, payrollRequest: new PayrollRequest()._id, amount: 4000, period: { year: 2026, month: 10 }, transactionId: "pi_c", paidAt: new Date() },
    ]);
  });

  it("gives employees only their own, newest period first", async () => {
    const res = await request(app).get("/api/payments/mine").set(bearer("ann"));
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((p) => p.period.month)).toEqual([10, 9]);
    expect(res.body.summary).toMatchObject({ totalPaid: 10800, last: { transactionId: "pi_b" } });
    expect(res.body.items[0]).not.toHaveProperty("payrollRequest");
    expect((await request(app).get("/api/payments/mine").set(bearer("hr1"))).status).toBe(403);
  });

  it("lets HR and admins look up any employee", async () => {
    const res = await request(app).get(`/api/payments?employee=${ann.id}`).set(bearer("hr1"));
    expect(res.body.total).toBe(2);
    expect((await request(app).get("/api/payments").set(bearer("root"))).body.total).toBe(3);
    expect((await request(app).get("/api/payments").set(bearer("ann"))).status).toBe(403);
  });
});
