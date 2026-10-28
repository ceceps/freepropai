import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db, passwordResetTokens, users } from '../db';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, updateUserRefreshToken } from './auth.service';
import { sendPasswordResetEmail } from './mailer.service';

const TOKEN_TTL_MS = 60 * 60 * 1000;
const GENERIC_MESSAGE = 'If an account exists for that email, we sent a reset link.';

function frontendBaseUrl(): string {
  return (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getGenericForgotMessage(): string {
  return GENERIC_MESSAGE;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.delete(passwordResetTokens).where(
    and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt))
  );

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${frontendBaseUrl()}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new AppError('This reset link is invalid or has expired', 400);
  }

  const passwordHash = await hashPassword(password);
  await db.update(users)
    .set({ passwordHash, refreshTokenHash: null, updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  await db.update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  await updateUserRefreshToken(row.userId, null);
}
