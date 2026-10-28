import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { bearer, firebaseMock, seedUser } from "./helpers.js";

vi.mock("../src/lib/firebase.js", () => firebaseMock);

const { default: app } = await import("../src/app.js");
const { connectDB, disconnectDB } = await import("../src/lib/db.js");
const { User } = await import("../src/db/models/User.js");
const { Worksheet } = await import("../src/db/models/Worksheet.js");
const { PayrollRequest } = await import("../src/db/models/PayrollRequest.js");
const { Payment } = await import("../src/db/models/Payment.js");
const { AuditLog, audit } = await import("../src/db/models/AuditLog.js");

const now = new Date();
const today = now.toISOString().slice(0, 10);
const period = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
const day = new Date(`${today}T00:00:00Z`);

let ann, hr, hr2, admin;

beforeAll(() => connectDB());
afterAll(() => disconnectDB());
beforeEach(async () => {
  await Promise.all([User, Worksheet, PayrollRequest, Payment, AuditLog].map((m) => m.deleteMany({})));
  [ann, hr, hr2, admin] = await Promise.all([
    seedUser(User, { uid: "ann", name: "Ann Lee", salary: 5400, isVerified: true }),
    seedUser(User, { uid: "hr1", role: "HR", name: "Hana HR" }),
    seedUser(User, { uid: "hr2", role: "HR" }),
    seedUser(User, { uid: "root", role: "admin", name: "Root Admin" }),
  ]);
});

describe("employee stats", () => {
  it("summarises the month, tasks, latest entries and last payment", async () => {
    await Worksheet.create([
      { user: ann._id, task: "Development", hours: 6, date: day },
      { user: ann._id, task: "Development", hours: 2, date: day },
      { user: ann._id, task: "Support", hours: 2, date: day },
    ]);
    const req = await PayrollRequest.create({ employee: ann._id, amount: 5400, period, requestedBy: hr._id });
    await Payment.create({ employee: ann._id, payrollRequest: req._id, amount: 5400, period, transactionId: "pi_1", paidAt: now });

    const res = await request(app).get(`/api/stats/me?today=${today}`).set(bearer("ann"));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ monthHours: 10, monthEntries: 3, daysLogged: 1, avgPerDay: 10 });
    expect(res.body.avgPerEntry).toBeCloseTo(3.33, 1);
    expect(res.body.taskDistribution).toEqual([{ label: "Development", value: 8 }, { label: "Support", value: 2 }]);
    expect(res.body.latestEntries).toHaveLength(3);
    expect(res.body.lastPayment).toMatchObject({ amount: 5400, transactionId: "pi_1" });
  });

  it("handles a brand-new employee", async () => {
    const res = await request(app).get("/api/stats/me").set(bearer("ann"));
    expect(res.body).toMatchObject({ monthHours: 0, avgPerDay: 0, avgPerEntry: 0, lastPayment: null, taskDistribution: [] });
  });

  it("is Employee only", async () => {
    expect((await request(app).get("/api/stats/me").set(bearer("hr1"))).status).toBe(403);
  });
});

describe("payroll stats", () => {
  beforeEach(async () => {
    const bea = await seedUser(User, { uid: "bea", salary: 4000, isVerified: true });
    await PayrollRequest.create([
      { employee: ann._id, amount: 5400, period, requestedBy: hr._id, status: "paid" },
      { employee: bea._id, amount: 4000, period, requestedBy: hr2._id, status: "pending" },
      { employee: bea._id, amount: 4000, period: { year: 2020, month: 1 }, requestedBy: hr2._id, status: "rejected" },
    ]);
  });

  it("gives admins every request, with a gap-free 12 month trend", async () => {
    const res = await request(app).get("/api/stats/payroll").set(bearer("root"));
    expect(res.body.trend).toHaveLength(12);
    expect(res.body.trend.at(-1)).toMatchObject({ ...period, requested: 9400, paid: 5400 });
    expect(res.body.trend[0]).toMatchObject({ requested: 0, paid: 0 });
    expect(res.body.all).toEqual({ pending: { count: 1, amount: 4000 }, paid: { count: 1, amount: 5400 }, rejected: { count: 1, amount: 4000 } });
    expect(res.body.thisMonth.rejected.count).toBe(0);
    expect(res.body.pending).toEqual({ count: 1, amount: 4000 });
  });

  it("anchors the figures to the month the browser asks for", async () => {
    const res = await request(app).get("/api/stats/payroll?year=2020&month=1").set(bearer("root"));
    expect(res.body.period).toEqual({ year: 2020, month: 1 });
    expect(res.body.thisMonth.rejected.count).toBe(1);
    expect(res.body.thisMonth.pending.count).toBe(0);
    expect((await request(app).get("/api/stats/payroll?month=13").set(bearer("root"))).status).toBe(400);
  });

  it("limits HR to the requests they sent", async () => {
    const res = await request(app).get("/api/stats/payroll").set(bearer("hr1"));
    expect(res.body.all.paid.count).toBe(1);
    expect(res.body.all.pending.count).toBe(0);
    expect(res.body.trend.at(-1).requested).toBe(5400);
  });

  it("is closed to Employees", async () => {
    expect((await request(app).get("/api/stats/payroll").set(bearer("ann"))).status).toBe(403);
  });
});

describe("activity feed", () => {
  it("merges audit entries and payments, newest first, admins only", async () => {
    await audit(admin, "role.change", ann, "Employee", "HR");
    await audit(admin, "salary.change", ann, 5000, 5400);
    const req = await PayrollRequest.create({ employee: ann._id, amount: 5400, period, requestedBy: hr._id, status: "paid" });
    await Payment.create({ employee: ann._id, payrollRequest: req._id, amount: 5400, period, transactionId: "pi_9", paidAt: new Date(Date.now() + 1000) });

    const res = await request(app).get("/api/stats/activity").set(bearer("root"));
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ kind: "Paid", text: expect.stringContaining("Ann Lee was paid $5,400") });
    const texts = res.body.items.map((i) => i.text);
    expect(texts).toContain("Ann Lee's salary changed from $5,000 to $5,400");
    expect(texts).toContain("Ann Lee was changed from Employee to HR");
    expect(res.body.items.find((i) => i.kind === "Role").detail).toBe("By Root Admin");

    expect((await request(app).get("/api/stats/activity").set(bearer("hr1"))).status).toBe(403);
  });
});
