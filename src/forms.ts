import { z } from 'zod';
import type { EmbedType, FormOptions, FormRecord, FormRow } from './types';

export const EMBED_TYPES = ['fullpage', 'standard', 'popup'] as const satisfies readonly EmbedType[];

export const EMOJI_ANIMATIONS = [
  'none',
  'wave',
  'tada',
  'heart-beat',
  'spin',
  'flash',
  'bounce',
  'rubber-band',
  'head-shake',
] as const;

const RESERVED_SLUGS = new Set([
  'admin',
  'authorize',
  'token',
  'register',
  'mcp',
  'sse',
  'oauth',
  'favicon.ico',
  'robots.txt',
]);

export const DEFAULT_OPTIONS: FormOptions = {
  transparentBackground: false,
  trackEvents: false,
  hideTitle: false,
  alignLeft: false,
  dynamicHeight: false,
  height: null,
  width: null,
  overlay: true,
  emojiText: '',
  emojiAnimation: 'none',
  showOnce: false,
  doNotShowAfterSubmit: true,
  autoClose: null,
};

export const optionsSchema = z.object({
  transparentBackground: z.boolean().optional(),
  trackEvents: z.boolean().optional(),
  hideTitle: z.boolean().optional(),
  alignLeft: z.boolean().optional(),
  dynamicHeight: z.boolean().optional(),
  height: z.number().int().min(100).max(5000).nullable().optional(),
  width: z.number().int().min(200).max(1600).nullable().optional(),
  overlay: z.boolean().optional(),
  emojiText: z.string().max(8).optional(),
  emojiAnimation: z.enum(EMOJI_ANIMATIONS).optional(),
  showOnce: z.boolean().optional(),
  doNotShowAfterSubmit: z.boolean().optional(),
  autoClose: z.number().int().min(0).max(600000).nullable().optional(),
});

export const slugSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only')
  .refine((s) => !RESERVED_SLUGS.has(s) && !s.endsWith('-'), 'Slug is reserved or invalid');

export const formInputSchema = z.object({
  tallyUrl: z.string().min(1),
  slug: slugSchema,
  title: z.string().max(200).optional(),
  embedType: z.enum(EMBED_TYPES).optional(),
  options: optionsSchema.optional(),
});

export const formUpdateSchema = z.object({
  tallyUrl: z.string().min(1).optional(),
  slug: slugSchema.optional(),
  title: z.string().max(200).optional(),
  embedType: z.enum(EMBED_TYPES).optional(),
  options: optionsSchema.optional(),
});

export type FormInput = z.infer<typeof formInputSchema>;
export type FormUpdate = z.infer<typeof formUpdateSchema>;

export function normalizeOptions(partial?: Record<string, unknown>): FormOptions {
  const defined =
    partial && typeof partial === 'object' && !Array.isArray(partial)
      ? Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined))
      : {};
  return { ...DEFAULT_OPTIONS, ...defined } as FormOptions;
}

export function parseTallyUrl(raw: string): { formId: string; canonicalUrl: string } {
  const input = raw.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new Error('Invalid Tally form URL');
  }
  if (!/(^|\.)tally\.so$/i.test(url.hostname)) {
    throw new Error('URL must be a tally.so form link');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  let formId: string | undefined;
  const marker = parts[0];
  if ((marker === 'r' || marker === 'embed' || marker === 'forms') && parts[1]) {
    formId = parts[1];
  }
  if (!formId || !/^[\w-]+$/i.test(formId)) {
    throw new Error('Could not find a form ID in the URL');
  }
  return { formId, canonicalUrl: `https://tally.so/r/${formId}` };
}

export function rowToRecord(row: FormRow): FormRecord {
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = JSON.parse(row.options || '{}') as Record<string, unknown>;
  } catch {
    parsed = undefined;
  }
  return {
    ...row,
    embed_type: row.embed_type as EmbedType,
    options: normalizeOptions(parsed),
  };
}

export async function listForms(db: D1Database): Promise<FormRecord[]> {
  const { results } = await db
    .prepare('SELECT * FROM forms ORDER BY created_at DESC')
    .all<FormRow>();
  return (results ?? []).map(rowToRecord);
}

export async function getFormBySlug(db: D1Database, slug: string): Promise<FormRecord | null> {
  const row = await db.prepare('SELECT * FROM forms WHERE slug = ?').bind(slug).first<FormRow>();
  return row ? rowToRecord(row) : null;
}

export async function getFormById(db: D1Database, id: string): Promise<FormRecord | null> {
  const row = await db.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRow>();
  return row ? rowToRecord(row) : null;
}

export async function createForm(
  db: D1Database,
  input: FormInput,
): Promise<{ record?: FormRecord; error?: string }> {
  const parsed = formInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  let formId: string;
  let canonicalUrl: string;
  try {
    ({ formId, canonicalUrl } = parseTallyUrl(parsed.data.tallyUrl));
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid Tally form URL' };
  }
  const existing = await getFormBySlug(db, parsed.data.slug);
  if (existing) return { error: `Slug "${parsed.data.slug}" is already in use` };
  const id = crypto.randomUUID();
  const record: FormRecord = {
    id,
    slug: parsed.data.slug,
    title: parsed.data.title?.trim() || parsed.data.slug,
    tally_url: canonicalUrl,
    form_id: formId,
    embed_type: parsed.data.embedType ?? 'fullpage',
    options: normalizeOptions(parsed.data.options),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    await db
      .prepare(
        'INSERT INTO forms (id, slug, title, tally_url, form_id, embed_type, options) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        record.id,
        record.slug,
        record.title,
        record.tally_url,
        record.form_id,
        record.embed_type,
        JSON.stringify(record.options),
      )
      .run();
  } catch (e) {
    if (e instanceof Error && /unique/i.test(e.message)) {
      return { error: `Slug "${record.slug}" is already in use` };
    }
    return { error: 'Database error while saving the form' };
  }
  return { record };
}

export async function updateForm(
  db: D1Database,
  record: FormRecord,
  input: FormUpdate,
): Promise<{ record?: FormRecord; error?: string }> {
  const parsed = formUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const next: FormRecord = { ...record };
  if (parsed.data.slug && parsed.data.slug !== record.slug) {
    const existing = await getFormBySlug(db, parsed.data.slug);
    if (existing) return { error: `Slug "${parsed.data.slug}" is already in use` };
    next.slug = parsed.data.slug;
  }
  if (parsed.data.tallyUrl) {
    try {
      const { formId, canonicalUrl } = parseTallyUrl(parsed.data.tallyUrl);
      next.form_id = formId;
      next.tally_url = canonicalUrl;
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid Tally form URL' };
    }
  }
  if (parsed.data.title !== undefined) next.title = parsed.data.title.trim() || next.slug;
  if (parsed.data.embedType) next.embed_type = parsed.data.embedType;
  if (parsed.data.options) {
    const overrides = Object.fromEntries(
      Object.entries(parsed.data.options).filter(([, v]) => v !== undefined),
    ) as Partial<FormOptions>;
    next.options = { ...next.options, ...overrides };
  }
  next.updated_at = new Date().toISOString();
  try {
    await db
      .prepare(
        'UPDATE forms SET slug = ?, title = ?, tally_url = ?, form_id = ?, embed_type = ?, options = ?, updated_at = ? WHERE id = ?',
      )
      .bind(
        next.slug,
        next.title,
        next.tally_url,
        next.form_id,
        next.embed_type,
        JSON.stringify(next.options),
        next.updated_at,
        next.id,
      )
      .run();
  } catch (e) {
    if (e instanceof Error && /unique/i.test(e.message)) {
      return { error: `Slug "${next.slug}" is already in use` };
    }
    return { error: 'Database error while updating the form' };
  }
  return { record: next };
}

export async function deleteForm(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM forms WHERE id = ?').bind(id).run();
}
