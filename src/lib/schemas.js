import { z } from "zod";

// Building blocks shared by every module's zod schemas.

export const objectId = (label = "id") => z.string().regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

export const idParams = (label) => z.object({ id: objectId(label) });

/** `page` and `limit` query fields with a per-list default and ceiling. */
export const paging = ({ limit = 10, max = 100 } = {}) => ({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(max).default(limit),
});
