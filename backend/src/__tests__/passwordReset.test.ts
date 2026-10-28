import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, passwordResetTokens } from '../db/schema';
import * as mailer from '../services/mailer.service';

describe('Password recovery', () => {
  const email = 'reset-user@freepropai.com';
  const originalPassword = 'oldpassword1';

  beforeEach(async () => {
    await db.delete(passwordResetTokens);
    await db.delete(users).where(eq(users.email, email));
  });

  async function registerUser() {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Reset User',
        email,
        password: originalPassword,
      })
      .expect(201);
  }

  describe('POST /api/auth/forgot-password', () => {
    it('requires an email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('returns the same success message whether the email exists or not', async () => {
      const missing = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      await registerUser();

      const existing = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(missing.body.success).toBe(true);
      expect(existing.body.success).toBe(true);
      expect(missing.body.message).toBe(existing.body.message);
    });

    it('emails a reset link when the account exists', async () => {
      await registerUser();
      const sendSpy = vi.spyOn(mailer, 'sendPasswordResetEmail').mockResolvedValue();

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy.mock.calls[0][0]).toBe(email);
      expect(sendSpy.mock.calls[0][1]).toMatch(/\/reset-password\?token=/);
      sendSpy.mockRestore();
    });

    it('does not email when the account does not exist', async () => {
      const sendSpy = vi.spyOn(mailer, 'sendPasswordResetEmail').mockResolvedValue();

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      expect(sendSpy).not.toHaveBeenCalled();
      sendSpy.mockRestore();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    async function requestResetToken(): Promise<string> {
      const sendSpy = vi.spyOn(mailer, 'sendPasswordResetEmail').mockResolvedValue();
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);
      const resetUrl = sendSpy.mock.calls[0][1] as string;
      sendSpy.mockRestore();
      return new URL(resetUrl).searchParams.get('token') as string;
    }

    it('rejects a missing token or short password', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ password: 'newpassword1' })
        .expect(400);

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'abc', password: 'short' })
        .expect(400);
    });

    it('rejects an invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'not-a-real-token', password: 'newpassword1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('sets a new password and allows login with it', async () => {
      await registerUser();
      const token = await requestResetToken();

      const reset = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'newpassword1' })
        .expect(200);

      expect(reset.body.success).toBe(true);

      await request(app)
        .post('/api/auth/login')
        .send({ email, password: originalPassword })
        .expect(401);

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'newpassword1' })
        .expect(200);

      expect(login.body.success).toBe(true);

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'anotherpass1' })
        .expect(400);
    });
  });
});
