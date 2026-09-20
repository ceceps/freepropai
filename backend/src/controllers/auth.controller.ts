import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import * as authService from '../services/auth.service';
import { authConfig } from '../config/auth';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import type { RegisterData, LoginCredentials } from '../types';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data: RegisterData = req.body;

  if (!data.email || !data.password || !data.name) {
    throw new AppError('Name, email, and password are required', 400);
  }

  const existing = await authService.findUserByEmail(data.email);
  if (existing) {
    throw new AppError('Email already registered', 400);
  }

  const user = await authService.createUser(data);
  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken();

  await authService.updateUserRefreshToken(user.id, authService.hashRefreshToken(refreshToken));

  res.cookie('refreshToken', refreshToken, authConfig.cookieOptions);

  res.status(201).json({
    success: true,
    data: { user, accessToken }
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password }: LoginCredentials = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const userRow = await authService.findUserByEmail(email);
  if (!userRow) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await authService.verifyPassword(password, userRow.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const user = await authService.findUserById(userRow.id);
  if (!user) throw new AppError('User not found', 404);

  await authService.updateLastLogin(user.id);

  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken();

  await authService.updateUserRefreshToken(user.id, authService.hashRefreshToken(refreshToken));

  res.cookie('refreshToken', refreshToken, authConfig.cookieOptions);

  res.json({
    success: true,
    data: { user, accessToken }
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (userId) {
    await authService.updateUserRefreshToken(userId, null);
  }

  res.clearCookie('refreshToken', { ...authConfig.cookieOptions, maxAge: 0 });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError('No refresh token', 401);
  }

  const tokenHash = authService.hashRefreshToken(refreshToken);

  const [userRow] = await db.select().from(users).where(eq(users.refreshTokenHash, tokenHash)).limit(1);

  if (!userRow) {
    res.clearCookie('refreshToken', { ...authConfig.cookieOptions, maxAge: 0 });
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await authService.findUserById(userRow.id);
  if (!user) throw new AppError('User not found', 404);

  const accessToken = authService.generateAccessToken(user);
  const newRefreshToken = authService.generateRefreshToken();

  await authService.updateUserRefreshToken(user.id, authService.hashRefreshToken(newRefreshToken));
  res.cookie('refreshToken', newRefreshToken, authConfig.cookieOptions);

  res.json({
    success: true,
    data: { accessToken }
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  res.json({
    success: true,
    data: { user: req.user }
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const { name, phone, location, avatarUrl, portraitPhotoUrl, fullbodyPhotoUrl } = req.body as {
    name?: string;
    phone?: string | null;
    location?: string | null;
    avatarUrl?: string | null;
    portraitPhotoUrl?: string | null;
    fullbodyPhotoUrl?: string | null;
  };

  if (name !== undefined && (!name || !name.trim())) {
    throw new AppError('Name cannot be empty', 400);
  }

  const user = await authService.updateUserProfile(req.user.id, {
    name,
    phone,
    location,
    avatarUrl,
    portraitPhotoUrl,
    fullbodyPhotoUrl,
  });

  res.json({
    success: true,
    data: { user }
  });
});

export const uploadProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (!req.file) {
    throw new AppError('File foto tidak ditemukan', 400);
  }

  // Validate format (png & jpg/jpeg only) and size max 5MB
  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedMimetypes.includes(req.file.mimetype)) {
    throw new AppError('Hanya format PNG dan JPG/JPEG yang diperbolehkan', 400);
  }

  if (req.file.size > 5 * 1024 * 1024) {
    throw new AppError('Ukuran file maksimal 5MB', 400);
  }

  const photoUrl = `/uploads/${req.file.filename}`;

  res.json({
    success: true,
    data: { url: photoUrl }
  });
});