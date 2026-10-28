import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { bearer, fakeAuth, firebaseMock, profile, seedUser } from "./helpers.js";

vi.mock("../src/lib/firebase.js", () => firebaseMock);

const { default: app } = await import("../src/app.js");
const { connectDB, disconnectDB } = await import("../src/lib/db.js");
const { User } = await import("../src/db/models/User.js");
const { AuditLog } = await import("../src/db/models/AuditLog.js");
const { decrypt } = await import("../src/lib/crypto.js");

beforeAll(() => connectDB());
afterAll(() => disconnectDB());
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({})]);
  vi.clearAllMocks();
});

describe("health and errors", () => {
  it("responds on /", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("returns a consistent 404 shape for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("authentication", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects invalid tokens", async () => {
    const res = await request(app).get("/api/users/me").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });

  it("blocks deactivated accounts", async () => {
    await seedUser(User, { uid: "gone", isActive: false });
    const res = await request(app).get("/api/users/me").set(bearer("gone"));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_DEACTIVATED");
  });
});

describe("/api/users/me", () => {
  it("reports an incomplete profile for a new Firebase account", async () => {
    const res = await request(app).get("/api/users/me").set(bearer("new"));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PROFILE_INCOMPLETE");
  });

  it("creates an Employee profile and ignores a requested role", async () => {
    const res = await request(app)
      .post("/api/users/me")
      .set(bearer("jane", "Jane@Company.com"))
      .send({ ...profile, role: "admin", email: "someone-else@evil.com" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: "Employee", email: "jane@company.com", isVerified: false, bankLast4: "6789" });
    expect(res.body).not.toHaveProperty("bankCipher");
    expect(res.body).not.toHaveProperty("firebaseUid");
    expect(firebaseMock.syncRoleClaim).toHaveBeenCalledWith("jane", "Employee");

    const stored = await User.findOne({ firebaseUid: "jane" }).select("+bankCipher");
    expect(stored.bankCipher).not.toContain("0123456789");
    expect(decrypt(stored.bankCipher)).toBe("0123456789");
  });

  it("refuses a second profile for the same account", async () => {
    await request(app).post("/api/users/me").set(bearer("jane")).send(profile);
    const res = await request(app).post("/api/users/me").set(bearer("jane")).send(profile);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PROFILE_EXISTS");
  });

  it("validates the profile body", async () => {
    const res = await request(app).post("/api/users/me").set(bearer("jane")).send({ name: "J", bankAccount: "12 34" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(["name", "designation", "salary", "bankAccount"]));
  });

  it("lets a user rename themselves but not change their role", async () => {
    await seedUser(User, { uid: "jane" });
    const res = await request(app).patch("/api/users/me").set(bearer("jane")).send({ name: "Jane Doe", role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Jane Doe", role: "Employee" });
  });
});

describe("/api/employees permissions", () => {
  let admin, hr, emp, otherHr;
  beforeEach(async () => {
    admin = await seedUser(User, { uid: "admin", role: "admin" });
    hr = await seedUser(User, { uid: "hr", role: "HR", name: "Hana HR" });
    otherHr = await seedUser(User, { uid: "hr2", role: "HR", name: "Omar HR" });
    emp = await seedUser(User, { uid: "emp", name: "Arif Employee", salary: 5000 });
    await seedUser(User, { uid: "old", name: "Sophie Former", isActive: false });
  });

  it("forbids employees", async () => {
    const res = await request(app).get("/api/employees").set(bearer("emp"));
    expect(res.status).toBe(403);
  });

  it("shows HR only active Employees", async () => {
    const res = await request(app).get("/api/employees?status=all").set(bearer("hr"));
    expect(res.status).toBe(200);
    expect(res.body.items.map((u) => u.name)).toEqual(["Arif Employee"]);
    expect(res.body.items[0]).not.toHaveProperty("bankCipher");
  });

  it("shows admins Employees and HR, filterable by status and search", async () => {
    const all = await request(app).get("/api/employees?status=all").set(bearer("admin"));
    expect(all.body.total).toBe(4);
    const inactive = await request(app).get("/api/employees?status=inactive").set(bearer("admin"));
    expect(inactive.body.items.map((u) => u.name)).toEqual(["Sophie Former"]);
    const search = await request(app).get("/api/employees?q=omar").set(bearer("admin"));
    expect(search.body.items.map((u) => u.name)).toEqual(["Omar HR"]);
  });

  it("returns scoped stats", async () => {
    const res = await request(app).get("/api/employees/stats").set(bearer("admin"));
    expect(res.body).toEqual({ total: 3, verified: 2, unverified: 1, hr: 2 });
  });

  it("lets HR verify an Employee but not another HR", async () => {
    const ok = await request(app).patch(`/api/employees/${emp.id}/verification`).set(bearer("hr")).send({ isVerified: true });
    expect(ok.status).toBe(200);
    expect(ok.body.isVerified).toBe(true);
    expect(await AuditLog.countDocuments({ action: "verification.change" })).toBe(1);

    const no = await request(app).patch(`/api/employees/${otherHr.id}/verification`).set(bearer("hr")).send({ isVerified: false });
    expect(no.status).toBe(404);
  });

  it("keeps role, salary and access changes admin-only", async () => {
    for (const [path, body] of [["role", { role: "HR" }], ["salary", { salary: 9000 }], ["status", { isActive: false }]]) {
      const res = await request(app).patch(`/api/employees/${emp.id}/${path}`).set(bearer("hr")).send(body);
      expect(res.status).toBe(403);
    }
  });

  it("promotes and demotes with a claim sync and audit entry", async () => {
    const res = await request(app).patch(`/api/employees/${emp.id}/role`).set(bearer("admin")).send({ role: "HR" });
    expect(res.body.role).toBe("HR");
    expect(firebaseMock.syncRoleClaim).toHaveBeenCalledWith("emp", "HR");
    const log = await AuditLog.findOne({ action: "role.change" });
    expect(log).toMatchObject({ from: "Employee", to: "HR" });
  });

  it("rejects admin as a target role", async () => {
    const res = await request(app).patch(`/api/employees/${emp.id}/role`).set(bearer("admin")).send({ role: "admin" });
    expect(res.status).toBe(400);
  });

  it("only allows salary increases", async () => {
    const down = await request(app).patch(`/api/employees/${emp.id}/salary`).set(bearer("admin")).send({ salary: 4000 });
    expect(down.status).toBe(422);
    expect(down.body.error.code).toBe("SALARY_NOT_INCREASED");
    const up = await request(app).patch(`/api/employees/${emp.id}/salary`).set(bearer("admin")).send({ salary: 5500 });
    expect(up.body.salary).toBe(5500);
  });

  it("deactivates, revokes sessions, and the user is locked out", async () => {
    const res = await request(app).patch(`/api/employees/${emp.id}/status`).set(bearer("admin")).send({ isActive: false });
    expect(res.body.isActive).toBe(false);
    expect(fakeAuth.revokeRefreshTokens).toHaveBeenCalledWith("emp");
    const after = await request(app).get("/api/users/me").set(bearer("emp"));
    expect(after.status).toBe(403);
  });

  it("also disconnects them from chat, and still succeeds when chat is down", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await request(app).patch(`/api/employees/${emp.id}/status`).set(bearer("admin")).send({ isActive: false });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://realtime.test/internal/kick",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-realtime-secret": "test-realtime-secret-0123456789" }), body: JSON.stringify({ userId: emp.id }) }),
    );

    await request(app).patch(`/api/employees/${emp.id}/status`).set(bearer("admin")).send({ isActive: true });
    fetchSpy.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const down = await request(app).patch(`/api/employees/${emp.id}/status`).set(bearer("admin")).send({ isActive: false });
    expect(down.status).toBe(200);
    expect(warn).toHaveBeenCalled();
    fetchSpy.mockRestore();
    warn.mockRestore();
  });

  it("validates ids", async () => {
    const res = await request(app).get("/api/employees/not-an-id").set(bearer("admin"));
    expect(res.status).toBe(400);
  });

  it("never exposes admins through the employees API", async () => {
    const res = await request(app).get(`/api/employees/${admin.id}`).set(bearer("admin"));
    expect(res.status).toBe(404);
  });
});
