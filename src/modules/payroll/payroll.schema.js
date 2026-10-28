import { z } from "zod";

const objectId = (label) => z.string().regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

export const idParams = z.object({ id: objectId("request id") });

export const createBody = z.object({
  employeeId: objectId("employee id"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const listQuery = z.object({
  status: z.enum(["pending", "paid", "rejected"]).optional(),
  employee: objectId("employee id").optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const rejectBody = z.object({ reason: z.string().trim().max(200).optional() });
