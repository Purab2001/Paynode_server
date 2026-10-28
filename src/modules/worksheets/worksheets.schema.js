import { z } from "zod";
import { TASKS } from "../../db/models/Worksheet.js";

export const idParams = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid entry id"),
});

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "Not a real date");

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the format YYYY-MM");

const entryFields = {
  task: z.enum(TASKS),
  hours: z.coerce.number().min(0.25, "Log at least 15 minutes").max(24, "A day only has 24 hours"),
  date: day,
  note: z.string().trim().max(200).default(""),
};

export const createBody = z.object(entryFields);
export const updateBody = z
  .object(entryFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

const paging = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

export const mineQuery = z.object({ from: day.optional(), to: day.optional(), ...paging });
export const summaryQuery = z.object({ today: day.optional() });

export const teamQuery = z.object({
  employee: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  month: month.optional(),
  task: z.enum(TASKS).optional(),
  status: z.enum(["submitted", "approved", "rejected"]).optional(),
  ...paging,
});

export const reviewBody = z.object({ status: z.enum(["approved", "rejected"]) });
