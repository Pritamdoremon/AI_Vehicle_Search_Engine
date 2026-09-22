import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next): void => {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => issue.message);
    response.status(400).json({ error: details[0] ?? 'Invalid request.', details });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof Error) {
    console.error('Request failed:', error.message);
  } else {
    console.error('Request failed with an unknown error.');
  }
  response.status(500).json({ error: 'An unexpected server error occurred.' });
};