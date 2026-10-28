import { z } from "zod";
import { objectId, paging } from "../../lib/schemas.js";

const page = paging({ limit: 5 });

export const mineQuery = z.object(page);
export const listQuery = z.object({ employee: objectId("employee id").optional(), ...page });
