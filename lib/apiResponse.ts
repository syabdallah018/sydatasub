/**
 * Standardized API response helpers for consistency across all routes
 */

export const ok = (data: any, status = 200) =>
  Response.json({ success: true, data }, { status });

export const err = (message: string, status = 400) =>
  Response.json({ success: false, error: message }, { status });

export const created = (data: any) =>
  Response.json({ success: true, data }, { status: 201 });

export const badRequest = (message: string) =>
  err(message, 400);

export const unauthorized = (message = "Unauthorized") =>
  err(message, 401);

export const forbidden = (message = "Forbidden") =>
  err(message, 403);

export const notFound = (message = "Not found") =>
  err(message, 404);

export const conflict = (message = "Conflict") =>
  err(message, 409);

export const serverError = (message = "Internal server error") =>
  err(message, 500);
