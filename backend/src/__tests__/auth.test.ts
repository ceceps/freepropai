import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('Auth API', () => {
  const email = 'auth-user@freepropai.com';
  const password = 'password123';

  beforeEach(async () => {
    await db.delete(users).where(eq(users.email, email));
  });

  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Auth User', email, password })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Auth User', email, password })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Auth User', email, password })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('logs in with valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Auth User', email, password })
      .expect(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(login.body.data.accessToken).toBeDefined();
    expect(login.body.data.user.email).toBe(email);
  });

  it('rejects invalid login', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('requires name, email, and password on register', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email })
      .expect(400);
  });

  it('rejects super_admin role on public register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Hacker', email, password, role: 'super_admin' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
