import { createMiddleware } from 'hono/factory';
import type { Env } from './types';

export const SESSION_COOKIE = 'tw_admin';
const SESSION_TTL_SECONDS = 7 * 24 * 3600;

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(input: string, expected: string): Promise<boolean> {
  return timingSafeEqualHex(await sha256Hex(input), await sha256Hex(expected));
}

export async function createSessionValue(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await hmacSha256(secret, `admin:${exp}`);
  return `${exp}.${sig}`;
}

export async function verifySessionValue(secret: string, value: string): Promise<boolean> {
  const dot = value.lastIndexOf('.');
  if (dot === -1) return false;
  const exp = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  const expected = await hmacSha256(secret, `admin:${exp}`);
  return timingSafeEqualHex(sig, expected);
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export const requireAdmin = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (c.req.path === '/admin/login') return next();
  const cookie = readCookie(c.req.header('cookie'), SESSION_COOKIE);
  if (!cookie || !(await verifySessionValue(c.env.ADMIN_PASSWORD, cookie))) {
    return c.redirect(`/admin/login?next=${encodeURIComponent(c.req.path)}`);
  }
  await next();
});
