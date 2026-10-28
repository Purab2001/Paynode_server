import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { bearer, firebaseMock, seedUser } from "./helpers.js";

vi.mock("../src/lib/firebase.js", () => firebaseMock);

const { default: app } = await import("../src/app.js");
const { connectDB, disconnectDB } = await import("../src/lib/db.js");
const { User } = await import("../src/db/models/User.js");
const { Worksheet } = await import("../src/db/models/Worksheet.js");
const { AuditLog } = await import("../src/db/models/AuditLog.js");

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const entry = { task: "Development", hours: 6.5, date: today, note: "Payroll filters" };

let ann, bob, hr, admin;

beforeAll(() => connectDB());
afterAll(() => disconnectDB());
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Worksheet.deleteMany({}), AuditLog.deleteMany({})]);
  [ann, bob, hr, admin] = await Promise.all([
    seedUser(User, { uid: "ann", name: "Ann Lee" }),
    seedUser(User, { uid: "bob", name: "Bob Ray" }),
    seedUser(User, { uid: "hr1", role: "HR" }),
    seedUser(User, { uid: "root", role: "admin" }),
  ]);
});

describe("employee entries", () => {
  it("creates, lists and totals own entries", async () => {
    const created = await request(app).post("/api/worksheets").set(bearer("ann")).send(entry);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ task: "Development", hours: 6.5, date: today, status: "submitted" });

    await request(app).post("/api/worksheets").set(bearer("ann")).send({ ...entry, hours: 2, date: daysAgo(1) });
    const list = await request(app).get("/api/worksheets/mine").set(bearer("ann"));
    expect(list.body.total).toBe(2);
    expect(list.body.totalHours).toBe(8.5);
    expect(list.body.items[0].date).toBe(today); // newest first
  });

  it("validates input", async () => {
    const post = (body) => request(app).post("/api/worksheets").set(bearer("ann")).send(body);
    expect((await post({ ...entry, hours: 0 })).status).toBe(400);
    expect((await post({ ...entry, hours: 25 })).status).toBe(400);
    expect((await post({ ...entry, task: "Napping" })).status).toBe(400);
    expect((await post({ ...entry, date: "27/10/2026" })).status).toBe(400);
    const future = await post({ ...entry, date: "2999-01-01" });
    expect(future.status).toBe(422);
    expect(future.body.error.code).toBe("FUTURE_DATE");
  });

  it("only lets Employees log time", async () => {
    expect((await request(app).post("/api/worksheets").set(bearer("hr1")).send(entry)).status).toBe(403);
    expect((await request(app).post("/api/worksheets")).status).toBe(401);
  });

  it("cannot read, edit or delete someone else's entry", async () => {
    const { body } = await request(app).post("/api/worksheets").set(bearer("ann")).send(entry);
    const mine = await request(app).get("/api/worksheets/mine").set(bearer("bob"));
    expect(mine.body.total).toBe(0);
    expect((await request(app).patch(`/api/worksheets/${body.id}`).set(bearer("bob")).send({ hours: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/worksheets/${body.id}`).set(bearer("bob"))).status).toBe(404);
    expect(await Worksheet.countDocuments()).toBe(1);
  });

  it("edits and deletes own entries", async () => {
    const { body } = await request(app).post("/api/worksheets").set(bearer("ann")).send(entry);
    const edited = await request(app).patch(`/api/worksheets/${body.id}`).set(bearer("ann")).send({ hours: 3, note: "Fixed" });
    expect(edited.body).toMatchObject({ hours: 3, note: "Fixed" });
    expect((await request(app).delete(`/api/worksheets/${body.id}`).set(bearer("ann"))).status).toBe(204);
    expect(await Worksheet.countDocuments()).toBe(0);
  });

  it("keeps the note when an update doesn't mention it", async () => {
    const { body } = await request(app).post("/api/worksheets").set(bearer("ann")).send(entry);
    const res = await request(app).patch(`/api/worksheets/${body.id}`).set(bearer("ann")).send({ hours: 2 });
    expect(res.body).toMatchObject({ hours: 2, note: "Payroll filters" });
  });

  it("clears the earlier review when an entry is resubmitted", async () => {
    const { body } = await request(app).post("/api/worksheets").set(bearer("ann")).send(entry);
    await request(app).patch(`/api/worksheets/${body.id}/status`).set(bearer("hr1")).send({ status: "rejected" });
    expect((await Worksheet.findById(body.id)).reviewedAt).toBeDefined();
    await request(app).patch(`/api/worksheets/${body.id}`).set(bearer("ann")).send({ hours: 5 });
    const stored = await Worksheet.findById(body.id);
    expect(stored.status).toBe("submitted");
    expect(stored.reviewedAt).toBeUndefined();
    expect(stored.reviewedBy).toBeUndefined();
  });

  it("locks approved entries and re-queues edited rejected ones", async () => {
    const { body } = await request(app).post("/api/worksheets").set(bearer("ann")).send(entry);

    await request(app).patch(`/api/worksheets/${body.id}/status`).set(bearer("hr1")).send({ status: "rejected" });
    const fixed = await request(app).patch(`/api/worksheets/${body.id}`).set(bearer("ann")).send({ hours: 5 });
    expect(fixed.body.status).toBe("submitted");

    await request(app).patch(`/api/worksheets/${body.id}/status`).set(bearer("hr1")).send({ status: "approved" });
    const locked = await request(app).patch(`/api/worksheets/${body.id}`).set(bearer("ann")).send({ hours: 1 });
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe("ENTRY_LOCKED");
    expect((await request(app).delete(`/api/worksheets/${body.id}`).set(bearer("ann"))).status).toBe(403);
  });

  it("summarises the week and month", async () => {
    await request(app).post("/api/worksheets").set(bearer("ann")).send({ ...entry, hours: 4 });
    await request(app).post("/api/worksheets").set(bearer("ann")).send({ ...entry, hours: 3 });
    const res = await request(app).get(`/api/worksheets/mine/summary?today=${today}`).set(bearer("ann"));
    expect(res.body.week).toHaveLength(5);
    expect(res.body.monthHours).toBe(7);
    expect(res.body.monthEntries).toBe(2);
    expect(res.body.daysLogged).toBe(1);
    // today falls on a weekend → week bars stay empty; otherwise they hold the 7 hours
    const day = new Date(`${today}T00:00:00Z`).getUTCDay();
    expect(res.body.weekHours).toBe(7);
    if (day >= 1 && day <= 5) expect(res.body.week.find((d) => d.date === today).hours).toBe(7);
  });
});

describe("team view", () => {
  beforeEach(async () => {
    await Worksheet.create([
      { user: ann._id, task: "Development", hours: 6, date: new Date(`${today}T00:00:00Z`) },
      { user: bob._id, task: "Support", hours: 3, date: new Date("2025-03-12T00:00:00Z") },
      { user: bob._id, task: "Sales", hours: 2, date: new Date("2025-03-20T00:00:00Z") },
    ]);
  });

  it("is closed to Employees", async () => {
    expect((await request(app).get("/api/worksheets").set(bearer("ann"))).status).toBe(403);
  });

  it("lets HR and admins filter by employee, month and task", async () => {
    const all = await request(app).get("/api/worksheets").set(bearer("hr1"));
    expect(all.body.total).toBe(3);
    expect(all.body.items[0].employee).toMatchObject({ name: "Ann Lee" });
    expect(all.body.items[0]).not.toHaveProperty("user");

    const byMonth = await request(app).get("/api/worksheets?month=2025-03").set(bearer("root"));
    expect(byMonth.body.total).toBe(2);
    expect(byMonth.body.totalHours).toBe(5);

    const byPerson = await request(app).get(`/api/worksheets?employee=${bob.id}&task=Sales`).set(bearer("hr1"));
    expect(byPerson.body.total).toBe(1);
  });

  it("finds entries by part of an employee's name, including deactivated people", async () => {
    await User.updateOne({ _id: bob._id }, { isActive: false });
    const res = await request(app).get("/api/worksheets?q=bo").set(bearer("hr1"));
    expect(res.body.total).toBe(2);
    expect((await request(app).get("/api/worksheets?q=zzz").set(bearer("hr1"))).body.total).toBe(0);
    expect((await request(app).get("/api/worksheets?q=(").set(bearer("hr1"))).status).toBe(200); // regex characters are escaped
  });

  it("rejects malformed filters", async () => {
    expect((await request(app).get("/api/worksheets?month=2025-13").set(bearer("hr1"))).status).toBe(400);
    expect((await request(app).get("/api/worksheets?employee=nope").set(bearer("hr1"))).status).toBe(400);
  });

  it("records approvals in the audit log", async () => {
    const target = await Worksheet.findOne({ user: bob._id });
    const res = await request(app).patch(`/api/worksheets/${target.id}/status`).set(bearer("hr1")).send({ status: "approved" });
    expect(res.body.status).toBe("approved");
    const log = await AuditLog.findOne({ action: "worksheet.approve" });
    expect(String(log.target)).toBe(bob.id);
    expect(String(log.actor)).toBe(hr.id);
    expect((await request(app).patch(`/api/worksheets/${target.id}/status`).set(bearer("bob")).send({ status: "approved" })).status).toBe(403);
  });
});
