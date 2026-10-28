import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { bearer, firebaseMock, seedUser } from "./helpers.js";

vi.mock("../src/lib/firebase.js", () => firebaseMock);

const { default: app } = await import("../src/app.js");
const { connectDB, disconnectDB } = await import("../src/lib/db.js");
const { User } = await import("../src/db/models/User.js");
const { PayrollRequest } = await import("../src/db/models/PayrollRequest.js");
const { AuditLog } = await import("../src/db/models/AuditLog.js");

const now = new Date();
const period = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

let ann, unverified, hr, hr2, admin;
const ask = (as, body) => request(app).post("/api/payroll").set(bearer(as)).send(body);

beforeAll(async () => {
  await connectDB();
  await PayrollRequest.init(); // the duplicate check relies on the unique index existing
});
afterAll(() => disconnectDB());
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), PayrollRequest.deleteMany({}), AuditLog.deleteMany({})]);
  [ann, unverified, hr, hr2, admin] = await Promise.all([
    seedUser(User, { uid: "ann", name: "Ann Lee", salary: 5400, isVerified: true }),
    seedUser(User, { uid: "newbie", salary: 3000 }),
    seedUser(User, { uid: "hr1", role: "HR" }),
    seedUser(User, { uid: "hr2", role: "HR" }),
    seedUser(User, { uid: "root", role: "admin" }),
  ]);
});

describe("creating requests", () => {
  it("snapshots the salary from the record, not from the client", async () => {
    const res = await ask("hr1", { employeeId: ann.id, ...period, amount: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 5400, status: "pending", period });
    expect(res.body.employee).toMatchObject({ name: "Ann Lee" });
    expect(res.body).not.toHaveProperty("paymentIntentId");
  });

  it("is HR only", async () => {
    expect((await ask("ann", { employeeId: ann.id, ...period })).status).toBe(403);
    expect((await ask("root", { employeeId: ann.id, ...period })).status).toBe(403);
  });

  it("requires a verified, active Employee", async () => {
    const res = await ask("hr1", { employeeId: unverified.id, ...period });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("NOT_VERIFIED");

    await User.updateOne({ _id: ann._id }, { isActive: false });
    expect((await ask("hr1", { employeeId: ann.id, ...period })).status).toBe(404);
    expect((await ask("hr1", { employeeId: hr2.id, ...period })).status).toBe(404); // HR can't be paid through this flow
  });

  it("rejects future months and bad input", async () => {
    const future = await ask("hr1", { employeeId: ann.id, year: period.year + 1, month: 1 });
    expect(future.body.error.code).toBe("FUTURE_PERIOD");
    expect((await ask("hr1", { employeeId: ann.id, year: 2026, month: 13 })).status).toBe(400);
    expect((await ask("hr1", { employeeId: "nope", ...period })).status).toBe(400);
  });

  it("blocks duplicates, including concurrent ones, but allows a retry after rejection", async () => {
    const [a, b] = await Promise.all([ask("hr1", { employeeId: ann.id, ...period }), ask("hr2", { employeeId: ann.id, ...period })]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const dup = a.status === 409 ? a : b;
    expect(dup.body.error.code).toBe("PAYROLL_DUPLICATE");
    expect(await PayrollRequest.countDocuments()).toBe(1);

    const [{ id }] = [a.status === 201 ? a.body : b.body];
    await request(app).patch(`/api/payroll/${id}/reject`).set(bearer("root")).send({ reason: "Wrong month" });
    expect((await ask("hr1", { employeeId: ann.id, ...period })).status).toBe(201);
  });
});

describe("listing", () => {
  beforeEach(async () => {
    await ask("hr1", { employeeId: ann.id, ...period });
    const other = await seedUser(User, { uid: "bea", name: "Bea", salary: 4000, isVerified: true });
    await ask("hr2", { employeeId: other.id, ...period });
  });

  it("shows HR only their own requests and admins everything", async () => {
    const mine = await request(app).get("/api/payroll").set(bearer("hr1"));
    expect(mine.body.total).toBe(1);
    expect(mine.body.counts).toEqual({ pending: 1, paid: 0, rejected: 0 });

    const all = await request(app).get("/api/payroll").set(bearer("root"));
    expect(all.body.total).toBe(2);
    expect(all.body.items[0].requestedBy).toMatchObject({ name: expect.any(String) });
  });

  it("filters by status while counts stay unfiltered", async () => {
    const res = await request(app).get("/api/payroll?status=paid").set(bearer("root"));
    expect(res.body.total).toBe(0);
    expect(res.body.counts.pending).toBe(2);
  });

  it("is closed to Employees", async () => {
    expect((await request(app).get("/api/payroll").set(bearer("ann"))).status).toBe(403);
  });
});

describe("rejecting", () => {
  it("is admin only, records a reason and an audit entry, and only works on pending requests", async () => {
    const { body } = await ask("hr1", { employeeId: ann.id, ...period });
    expect((await request(app).patch(`/api/payroll/${body.id}/reject`).set(bearer("hr1")).send({})).status).toBe(403);

    const res = await request(app).patch(`/api/payroll/${body.id}/reject`).set(bearer("root")).send({ reason: "Hours not approved" });
    expect(res.body).toMatchObject({ status: "rejected", rejectReason: "Hours not approved" });
    expect(await AuditLog.countDocuments({ action: "payroll.reject" })).toBe(1);

    const again = await request(app).patch(`/api/payroll/${body.id}/reject`).set(bearer("root")).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("PAYROLL_NOT_PENDING");
  });
});
