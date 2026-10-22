// Expected failures: printed as a plain message, without a stack trace.
export class UserError extends Error {
  override name = "UserError";
}

export class Cancelled extends Error {
  override name = "Cancelled";
}
