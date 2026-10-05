import net from 'node:net';
import tls from 'node:tls';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function encodeAuth(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

async function smtpSend(options: {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure: boolean;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const connect = (): Promise<net.Socket> =>
    new Promise((resolve, reject) => {
      const socket = options.secure
        ? tls.connect({ host: options.host, port: options.port, servername: options.host })
        : net.connect({ host: options.host, port: options.port });
      socket.setEncoding('utf8');
      socket.once('error', reject);
      socket.once('connect', () => resolve(socket));
    });

  const socket = await connect();
  let buffer = '';

  const read = (expected: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const onData = (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        const last = lines[lines.length - 1];
        if (last && /^\d{3}[\s-]/.test(last) && !last.startsWith(`${expected}-`) && last.startsWith(String(expected))) {
          const msg = buffer;
          buffer = '';
          socket.off('data', onData);
          resolve(msg);
        }
      };
      socket.on('data', onData);
      socket.once('error', reject);
    });

  const write = async (line: string, expected: number) => {
    socket.write(`${line}\r\n`);
    return read(expected);
  };

  await read(220);
  await write(`EHLO freepropai`, 250);
  if (options.user && options.pass) {
    await write('AUTH LOGIN', 334);
    await write(encodeAuth(options.user), 334);
    await write(encodeAuth(options.pass), 235);
  }
  await write(`MAIL FROM:<${options.from}>`, 250);
  await write(`RCPT TO:<${options.to}>`, 250);
  await write('DATA', 354);
  const payload = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    options.text,
    '.',
  ].join('\r\n');
  socket.write(`${payload}\r\n`);
  await read(250);
  await write('QUIT', 221);
  socket.end();
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const host = env('SMTP_HOST');
  const from = env('SMTP_FROM') || 'noreply@freepropai.com';
  const subject = 'Reset your FreePropAI password';
  const text = [
    'We received a request to reset your FreePropAI password.',
    '',
    `Open this link to choose a new password (expires in 1 hour):`,
    resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  if (!host) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[mailer] SMTP_HOST unset. Password reset link for ${to}: ${resetUrl}`);
    }
    return;
  }

  await smtpSend({
    host,
    port: Number(env('SMTP_PORT') || '587'),
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
    secure: env('SMTP_SECURE') === 'true',
    from,
    to,
    subject,
    text,
  });
}
