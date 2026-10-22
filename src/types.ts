import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface Env {
  DB: D1Database;
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  ADMIN_PASSWORD: string;
}

export type EmbedType = 'fullpage' | 'standard' | 'popup';

export interface FormOptions {
  transparentBackground: boolean;
  trackEvents: boolean;
  hideTitle: boolean;
  alignLeft: boolean;
  dynamicHeight: boolean;
  height: number | null;
  width: number | null;
  overlay: boolean;
  emojiText: string;
  emojiAnimation: string;
  showOnce: boolean;
  doNotShowAfterSubmit: boolean;
  autoClose: number | null;
}

export interface FormRecord {
  id: string;
  slug: string;
  title: string;
  tally_url: string;
  form_id: string;
  embed_type: EmbedType;
  options: FormOptions;
  created_at: string;
  updated_at: string;
}

export interface FormRow {
  id: string;
  slug: string;
  title: string;
  tally_url: string;
  form_id: string;
  embed_type: string;
  options: string;
  created_at: string;
  updated_at: string;
}
