/**
 * Converts an unknown error value to an Error instance.
 * Useful for catch blocks where the error type is unknown.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Unknown error");
}
