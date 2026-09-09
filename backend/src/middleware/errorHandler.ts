import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next): void => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Invalid request.', details: error.issues.map((issue) => issue.message) });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: 'An unexpected server error occurred.' });
};