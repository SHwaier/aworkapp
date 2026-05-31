/**
 * Custom error class for business-logic errors that are safe to expose to clients.
 * Using this instead of bare `throw new Error()` prevents handleApiError from
 * swallowing the message and returning a generic 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
