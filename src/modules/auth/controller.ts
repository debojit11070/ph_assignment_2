import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import StatusCode from 'http-status-codes';
import pool from '../../config/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role?: 'contributor' | 'maintainer';
}

export interface LoginBody {
  email: string;
  password: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'contributor' | 'maintainer';
  created_at: string;
  updated_at: string;
}

const generateToken = (user: User): string => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '7d' }
  );
};

export const signup = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'contributor' }: SignupBody = req.body;

    // Validation
    if (!name || !email || !password) {
      sendError(res, 'Name, email, and password are required', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    if (!['contributor', 'maintainer'].includes(role)) {
      sendError(res, 'Role must be either contributor or maintainer', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    // Check if email already exists
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      sendError(res, 'Email already registered', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at, updated_at',
      [name, email, hashedPassword, role]
    );

    const user = result.rows[0] as User;

    sendSuccess(
      res,
      'User registered successfully',
      user,
      StatusCode.CREATED
    );
  } catch (error) {
    console.error('Signup error:', error);
    sendError(res, 'Internal server error', undefined, StatusCode.INTERNAL_SERVER_ERROR);
  }
};

export const login = async (req: any, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginBody = req.body;

    // Validation
    if (!email || !password) {
      sendError(res, 'Email and password are required', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    // Find user
    const result = await pool.query(
      'SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Invalid email or password', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Invalid email or password', undefined, StatusCode.BAD_REQUEST);
      return;
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(res, 'Login successful', {
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Internal server error', undefined, StatusCode.INTERNAL_SERVER_ERROR);
  }
};
