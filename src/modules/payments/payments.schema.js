import { z } from "zod";

const paging = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(5),
};

export const mineQuery = z.object(paging);
export const listQuery = z.object({ employee: z.string().regex(/^[a-f\d]{24}$/i).optional(), ...paging });
