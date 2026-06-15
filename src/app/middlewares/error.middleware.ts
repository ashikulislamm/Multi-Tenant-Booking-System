import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any = undefined;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database Validation Error';
    errors = err.message;
  } else if ((err as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource detected. A record with these unique fields already exists.';
    errors = (err as any).keyValue;
  } else {
    // Log non-operational/internal system failures
    console.error('💥 Internal Server Error:', err);
  }
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};