import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";
import { isProduction } from "./env";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class PaymentError extends AppError {
  constructor(message: string) {
    super(402, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(429, message);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.error(err.message, err, {
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id,
      statusCode: err.statusCode,
    });

    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
        ...(isProduction() ? {} : { stack: err.stack }),
      },
    });
    return;
  }

  // Unhandled errors
  logger.error("Unhandled error", err, {
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  });

  res.status(500).json({
    error: {
      message: isProduction() ? "Internal server error" : err.message,
      statusCode: 500,
      ...(isProduction() ? {} : { stack: err.stack }),
    },
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
    },
  });
}
