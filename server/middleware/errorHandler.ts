import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "validation_error", message: "Invalid request payload.", details: err.issues },
    });
    return;
  }
  console.error("[ecoguard] unhandled error:", err);
  res.status(500).json({
    error: { code: "internal_error", message: "The server failed to process this request." },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "not_found", message: "Unknown API route." } });
}

/** Wraps an async route handler so rejections reach the error middleware. */
export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

export const apiRouter = Router();
