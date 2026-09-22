import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import { AppError } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/authenticate';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.'),
  email: z.string().trim().email('Invalid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});

function createToken(userId: number): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is missing.');
  }

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: '7d' }
  );
}

export function createAuthController() {
  return {
    register: async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const input = registerSchema.parse(request.body);
        const email = input.email.toLowerCase();

        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          throw new AppError(409, 'Email already exists.');
        }

        const passwordHash = await bcrypt.hash(
          input.password,
          10
        );

        const result = await pool.query(
          `
          INSERT INTO users (name, email, password_hash)
          VALUES ($1, $2, $3)
          RETURNING id, name, email, created_at
          `,
          [input.name, email, passwordHash]
        );

        const user = result.rows[0];

        response.status(201).json({
          message: 'Registration successful.',
          user,
          token: createToken(user.id)
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    login: async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const input = loginSchema.parse(request.body);
        const email = input.email.toLowerCase();

        const result = await pool.query(
          `
          SELECT id, name, email, password_hash, created_at
          FROM users
          WHERE email = $1
          `,
          [email]
        );

        if (result.rows.length === 0) {
          throw new AppError(
            401,
            'Invalid email or password.'
          );
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
          input.password,
          user.password_hash
        );

        if (!passwordMatch) {
          throw new AppError(
            401,
            'Invalid email or password.'
          );
        }

        response.json({
          message: 'Login successful.',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at
          },
          token: createToken(user.id)
        });
      } catch (error: unknown) {
        next(error);
      }
    },

    me: async (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const result = await pool.query(
          `
          SELECT id, name, email, created_at
          FROM users
          WHERE id = $1
          `,
          [request.userId]
        );

        if (result.rows.length === 0) {
          throw new AppError(404, 'User not found.');
        }

        response.json({
          user: result.rows[0]
        });
      } catch (error: unknown) {
        next(error);
      }
    }
  };
}