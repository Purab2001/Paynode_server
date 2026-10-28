import { z } from "zod";

const name = z.string().trim().min(2, "Enter your full name").max(80);
const photoUrl = z.union([z.url({ protocol: /^https$/ }), z.literal("")]);

// `role` is deliberately absent: everyone signs up as an Employee and an admin assigns HR.
export const createProfileBody = z.object({
  name,
  designation: z.string().trim().min(2, "Enter your job title").max(80),
  salary: z.coerce.number().positive("Enter your monthly salary").max(1_000_000),
  bankAccount: z.string().trim().regex(/^\d{6,20}$/, "Use 6–20 digits, no spaces"),
  photoUrl: photoUrl.optional(),
});

export const updateProfileBody = z
  .object({ name: name.optional(), photoUrl: photoUrl.optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
