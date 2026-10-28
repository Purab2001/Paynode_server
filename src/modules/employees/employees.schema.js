import { z } from "zod";
import { idParams as idParamsFor, paging } from "../../lib/schemas.js";

export const idParams = idParamsFor("employee id");

export const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  role: z.enum(["Employee", "HR"]).optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  verified: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  ...paging({ limit: 50 }),
});

export const verificationBody = z.object({ isVerified: z.boolean() });
export const roleBody = z.object({ role: z.enum(["Employee", "HR"]) });
export const salaryBody = z.object({ salary: z.coerce.number().positive().max(1_000_000) });
export const statusBody = z.object({ isActive: z.boolean() });
