import { z } from "zod";
import { TOPICS } from "../../db/models/ContactMessage.js";

export const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid message id") });

export const submitBody = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(120).optional().default(""),
  size: z.string().trim().max(40).optional().default(""),
  topic: z.enum(TOPICS),
  message: z.string().trim().min(20).max(4000),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().optional(),
});

export const listQuery = z.object({
  status: z.enum(["new", "read", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const statusBody = z.object({ status: z.enum(["new", "read", "archived"]) });
