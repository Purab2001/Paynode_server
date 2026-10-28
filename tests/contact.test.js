import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { bearer, firebaseMock, seedUser } from "./helpers.js";

vi.mock("../src/lib/firebase.js", () => firebaseMock);

const { default: app } = await import("../src/app.js");
const { connectDB, disconnectDB } = await import("../src/lib/db.js");
const { User } = await import("../src/db/models/User.js");
const { ContactMessage } = await import("../src/db/models/ContactMessage.js");

const form = {
  name: "Jane Cooper",
  email: "Jane@Company.com",
  company: "Northwind",
  size: "11–50 employees",
  topic: "sales",
  message: "We'd like to move our monthly payroll over from spreadsheets.",
};

beforeAll(() => connectDB());
afterAll(() => disconnectDB());
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), ContactMessage.deleteMany({})]);
  await Promise.all([seedUser(User, { uid: "root", role: "admin" }), seedUser(User, { uid: "hr1", role: "HR" })]);
});

describe("public submission", () => {
  it("stores a message without signing in", async () => {
    const res = await request(app).post("/api/contact").send(form);
    expect(res.status).toBe(201);
    const saved = await ContactMessage.findOne();
    expect(saved).toMatchObject({ email: "jane@company.com", topic: "sales", status: "new" });
  });

  it("validates input", async () => {
    const post = (body) => request(app).post("/api/contact").send(body);
    expect((await post({ ...form, message: "too short" })).status).toBe(400);
    expect((await post({ ...form, email: "nope" })).status).toBe(400);
    expect((await post({ ...form, topic: "spam" })).status).toBe(400);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it("quietly drops bot submissions that fill the honeypot", async () => {
    const res = await request(app).post("/api/contact").send({ ...form, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });
});

describe("admin inbox", () => {
  beforeEach(() => ContactMessage.create([{ ...form, email: "a@x.com" }, { ...form, email: "b@x.com", status: "read" }]));

  it("is admin only", async () => {
    expect((await request(app).get("/api/contact")).status).toBe(401);
    expect((await request(app).get("/api/contact").set(bearer("hr1"))).status).toBe(403);
  });

  it("lists with an unread count and a status filter", async () => {
    const all = await request(app).get("/api/contact").set(bearer("root"));
    expect(all.body).toMatchObject({ total: 2, unread: 1 });
    const read = await request(app).get("/api/contact?status=read").set(bearer("root"));
    expect(read.body.total).toBe(1);
    expect((await request(app).get("/api/contact/unread-count").set(bearer("root"))).body).toEqual({ unread: 1 });
  });

  it("updates the status", async () => {
    const msg = await ContactMessage.findOne({ status: "new" });
    const res = await request(app).patch(`/api/contact/${msg.id}`).set(bearer("root")).send({ status: "archived" });
    expect(res.body.status).toBe("archived");
    expect((await request(app).patch(`/api/contact/${msg.id}`).set(bearer("root")).send({ status: "bogus" })).status).toBe(400);
    expect((await request(app).patch("/api/contact/aaaaaaaaaaaaaaaaaaaaaaaa").set(bearer("root")).send({ status: "read" })).status).toBe(404);
  });
});
