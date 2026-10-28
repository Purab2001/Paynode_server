import { z } from "zod";

export const idParams = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid employee id"),
});

export const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  role: z.enum(["Employee", "HR"]).optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  verified: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const verificationBody = z.object({ isVerified: z.boolean() });
export const roleBody = z.object({ role: z.enum(["Employee", "HR"]) });
export const salaryBody = z.object({ salary: z.coerce.number().positive().max(1_000_000) });
export const statusBody = z.object({ isActive: z.boolean() });
