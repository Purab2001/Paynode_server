/** An error that maps to an HTTP response. `code` is a stable string the client can branch on. */
export class HttpError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code ?? defaultCodes[status] ?? "ERROR";
    this.details = details;
  }
}

const defaultCodes = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE",
  429: "RATE_LIMITED",
};

export const badRequest = (msg, code, details) => new HttpError(400, msg, code, details);
export const unauthenticated = (msg = "Please sign in to continue.") => new HttpError(401, msg);
export const forbidden = (msg = "You don't have permission to do that.", code) => new HttpError(403, msg, code);
export const notFound = (msg = "Not found.") => new HttpError(404, msg);
export const conflict = (msg, code) => new HttpError(409, msg, code);
export const unprocessable = (msg, code) => new HttpError(422, msg, code);
