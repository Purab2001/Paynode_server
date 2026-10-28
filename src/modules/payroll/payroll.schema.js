import { z } from "zod";
import { idParams as idParamsFor, objectId, paging } from "../../lib/schemas.js";

export const idParams = idParamsFor("request id");

export const createBody = z.object({
  employeeId: objectId("employee id"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const listQuery = z.object({
  status: z.enum(["pending", "paid", "rejected"]).optional(),
  employee: objectId("employee id").optional(),
  ...paging(),
});

export const rejectBody = z.object({ reason: z.string().trim().max(200).optional() });
