import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  // Expected application errors have a specific status and message.
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  // Preserve client errors raised while reading the request body.
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  ) {
    res.status(error.status).json({ message: "Invalid request body" });
    return;
  }

  // Keep unexpected technical details in the server logs.
  console.error("Unexpected error:", error);
  res.status(500).json({ message: "Internal server error" });
}
