import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  createSuperAdmin,
  upsertSuperAdmin,
  findSuperAdmin,
  verifyPassword,
} from '../services/auth.service';

describe('createSuperAdmin', () => {
  const email = 'super-admin@freepropai.com';

  beforeEach(async () => {
    await db.delete(users).where(eq(users.role, 'super_admin'));
    await db.delete(users).where(eq(users.email, email));
  });

  it('creates a user with super_admin role', async () => {
    const user = await createSuperAdmin({
      email,
      password: 'superpass123',
      name: 'Platform Admin',
    });

    expect(user.email).toBe(email);
    expect(user.name).toBe('Platform Admin');
    expect(user.role).toBe('super_admin');

    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    expect(row).toBeDefined();
    expect(await verifyPassword('superpass123', row.passwordHash)).toBe(true);
  });

  it('rejects duplicate email', async () => {
    await createSuperAdmin({ email, password: 'superpass123' });
    await expect(createSuperAdmin({ email, password: 'superpass123' }))
      .rejects.toThrow(/already registered/i);
  });

  it('updates only the password when a super admin already exists', async () => {
    await createSuperAdmin({ email, password: 'superpass123', name: 'Platform Admin' });

    const result = await upsertSuperAdmin({ password: 'newsuperpass1' });

    expect(result.action).toBe('updated');
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe('Platform Admin');
    expect(result.user.role).toBe('super_admin');

    const row = await findSuperAdmin();
    expect(row).toBeDefined();
    expect(await verifyPassword('newsuperpass1', row!.passwordHash)).toBe(true);
    expect(await verifyPassword('superpass123', row!.passwordHash)).toBe(false);
  });
});
