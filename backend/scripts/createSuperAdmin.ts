import { findSuperAdmin, upsertSuperAdmin } from '../src/services/auth.service';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function usage(): never {
  console.error('Usage:');
  console.error('  tsx scripts/createSuperAdmin.ts --check');
  console.error('  tsx scripts/createSuperAdmin.ts --email EMAIL --password PASSWORD [--name NAME]');
  console.error('  tsx scripts/createSuperAdmin.ts --password PASSWORD');
  process.exit(1);
}

async function main() {
  if (hasFlag('--check')) {
    const existing = await findSuperAdmin();
    if (existing) {
      console.log(JSON.stringify({ exists: true, email: existing.email, name: existing.name }));
    } else {
      console.log(JSON.stringify({ exists: false }));
    }
    return;
  }

  const email = argValue('--email')?.trim();
  const password = argValue('--password');
  const name = argValue('--name')?.trim();

  if (!password) usage();

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const existing = await findSuperAdmin();
  if (!existing) {
    if (!email) usage();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      console.error('Invalid email address');
      process.exit(1);
    }
  }

  const result = await upsertSuperAdmin({ email, password, name });
  console.log(JSON.stringify({
    ok: true,
    action: result.action,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    },
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
