/** The envelope every paginated list returns next to its items: `{ total, page, pages }`. */
export const pageInfo = (total, page, limit) => ({ total, page, pages: Math.max(1, Math.ceil(total / limit)) });
