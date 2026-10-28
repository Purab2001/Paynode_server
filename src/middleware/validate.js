/**
 * Validate request parts with zod schemas. Parsed values land on req.valid.{params,query,body}
 * (Express 5 makes req.query read-only, so we don't overwrite the originals).
 */
export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    for (const part of ["params", "query", "body"]) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  };
}
