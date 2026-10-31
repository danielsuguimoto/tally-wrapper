import type { Env } from '../src/types';

export function makeKV(): KVNamespace {
  const values = new Map<string, { value: string; expires?: number }>();
  return {
    async get(key: string, options?: string | { type?: string }) {
      const entry = values.get(key);
      if (!entry || (entry.expires !== undefined && entry.expires <= Date.now() / 1000)) return null;
      const type = typeof options === 'string' ? options : options?.type;
      return type === 'json' ? JSON.parse(entry.value) : entry.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      values.set(key, {
        value,
        expires:
          options?.expirationTtl === undefined
            ? undefined
            : Date.now() / 1000 + options.expirationTtl,
      });
    },
    async delete(key: string) {
      values.delete(key);
    },
    async list({ prefix }: { prefix?: string }) {
      return {
        keys: [...values.keys()]
          .filter((name) => name.startsWith(prefix ?? ''))
          .map((name) => ({ name })),
        list_complete: true,
        cursor: '',
      };
    },
  } as unknown as KVNamespace;
}

export function makeEnv(kv: KVNamespace): Env {
  return {
    DB: {} as D1Database,
    OAUTH_KV: kv,
    MCP_OBJECT: {} as Env['MCP_OBJECT'],
    OAUTH_PROVIDER: {} as Env['OAUTH_PROVIDER'],
    ADMIN_PASSWORD: 'test-admin-password',
  };
}

export function makeCtx(): ExecutionContext & { awaited: Promise<unknown>[] } {
  const awaited: Promise<unknown>[] = [];
  return {
    awaited,
    waitUntil(p: Promise<unknown>) {
      awaited.push(p);
    },
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext & { awaited: Promise<unknown>[] };
}
