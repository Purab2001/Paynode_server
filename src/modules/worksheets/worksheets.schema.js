import { z } from "zod";
import { TASKS } from "../../db/models/Worksheet.js";
import { idParams as idParamsFor, objectId, paging } from "../../lib/schemas.js";

export const idParams = idParamsFor("entry id");

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "Not a real date");

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the format YYYY-MM");

const entryFields = {
  task: z.enum(TASKS),
  hours: z.coerce.number().min(0.25, "Log at least 15 minutes").max(24, "A day only has 24 hours"),
  date: day,
  note: z.string().trim().max(200),
};

// The note defaults to blank on create only. On update a missing note must stay as it is, not be wiped.
export const createBody = z.object({ ...entryFields, note: entryFields.note.default("") });
export const updateBody = z
  .object(entryFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

const page = paging();

export const mineQuery = z.object({ from: day.optional(), to: day.optional(), ...page });
export const summaryQuery = z.object({ today: day.optional() });

export const teamQuery = z.object({
  employee: objectId("employee id").optional(),
  q: z.string().trim().max(80).optional(), // part of an employee's name
  month: month.optional(),
  task: z.enum(TASKS).optional(),
  status: z.enum(["submitted", "approved", "rejected"]).optional(),
  ...page,
});

export const reviewBody = z.object({ status: z.enum(["approved", "rejected"]) });
