import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { ContactMessage } from "../../db/models/ContactMessage.js";
import { notFound } from "../../lib/errors.js";
import { pageInfo } from "../../lib/pagination.js";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { idParams, listQuery, statusBody, submitBody } from "./contact.schema.js";

export const contactRouter = Router();

// The form is public, so it gets a much tighter limit than the rest of the API.
const submitLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { error: { code: "RATE_LIMITED", message: "You've sent a few messages already. Please try again later." } },
});

contactRouter.post("/", submitLimit, validate({ body: submitBody }), async (req, res) => {
  const { website, ...fields } = req.valid.body;
  // A bot filled the hidden field. Pretend it worked so it doesn't retry, but store nothing.
  if (!website) await ContactMessage.create(fields);
  res.status(201).json({ ok: true });
});

// Admin inbox
contactRouter.use(authenticate(), requireRole("admin"));

contactRouter.get("/", validate({ query: listQuery }), async (req, res) => {
  const { status, page, limit } = req.valid.query;
  const filter = status ? { status } : {};
  const [items, total, unread] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ status: "new" }),
  ]);
  res.json({ items, unread, ...pageInfo(total, page, limit) });
});

contactRouter.get("/unread-count", async (req, res) => {
  res.json({ unread: await ContactMessage.countDocuments({ status: "new" }) });
});

contactRouter.patch("/:id", validate({ params: idParams, body: statusBody }), async (req, res) => {
  const message = await ContactMessage.findByIdAndUpdate(req.valid.params.id, { status: req.valid.body.status }, { returnDocument: "after" });
  if (!message) throw notFound("Message not found.");
  res.json(message);
});
