import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import { authConfig } from '../config/auth';
import type { User, UserRole, RegisterData } from '../types';

export const hashPassword = (plaintext: string): Promise<string> =>
  bcrypt.hash(plaintext, authConfig.bcryptCost);

export const verifyPassword = (plaintext: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plaintext, hash);

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (user: User): string =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role } as JwtPayload,
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtAccessExpiry as any }
  );

export const verifyAccessToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, authConfig.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
};

export const generateRefreshToken = (): string =>
  crypto.randomBytes(64).toString('hex');

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const mapUserRow = (row: typeof users.$inferSelect): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  phone: row.phone,
  location: row.location,
  role: row.role as UserRole,
  regionScope: row.regionScope,
  avatarUrl: row.avatarUrl,
  lastLoginAt: row.lastLoginAt,
  createdAt: row.createdAt!,
  updatedAt: row.updatedAt!,
});

export const createUser = async (data: RegisterData): Promise<User> => {
  const passwordHash = await hashPassword(data.password!);
  const [row] = await db.insert(users).values({
    email: data.email.toLowerCase().trim(),
    passwordHash,
    name: data.name.trim(),
    phone: data.phone?.trim(),
    role: data.role ?? 'solo_agent',
    regionScope: data.regionScope?.trim(),
  }).returning();
  return mapUserRow(row);
};

export const findUserByEmail = async (email: string): Promise<(typeof users.$inferSelect) | null> => {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return row ?? null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? mapUserRow(row) : null;
};

export const updateUserRefreshToken = async (userId: string, tokenHash: string | null): Promise<void> => {
  await db.update(users)
    .set({ refreshTokenHash: tokenHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
};

export const updateLastLogin = async (userId: string): Promise<void> => {
  await db.update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
};

export interface UpdateProfileData {
  name?: string;
  phone?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
}

export const updateUserProfile = async (userId: string, data: UpdateProfileData): Promise<User> => {
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.phone !== undefined) patch.phone = data.phone?.trim() || null;
  if (data.location !== undefined) patch.location = data.location?.trim() || null;
  if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl || null;

  const [row] = await db.update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning();

  return mapUserRow(row);
};