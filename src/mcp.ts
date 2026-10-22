import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env, FormRecord } from './types';
import {
  createForm,
  deleteForm,
  getFormBySlug,
  listForms,
  optionsSchema,
  slugSchema,
  updateForm,
  EMBED_TYPES,
} from './forms';
import { buildEmbedCode } from './embed';

function describe(form: FormRecord, origin: string) {
  return {
    slug: form.slug,
    title: form.title,
    tallyUrl: form.tally_url,
    formId: form.form_id,
    embedType: form.embed_type,
    options: form.options,
    publicUrl: `${origin}/${form.slug}`,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
  };
}

interface OAuthProps extends Record<string, unknown> {
  userId: string;
  origin: string;
}

export class TallyMCP extends McpAgent<Env, {}, OAuthProps> {
  server = new McpServer({ name: 'tally-wrapper', version: '0.1.0' });

  private origin(): string {
    return this.props?.origin ?? '';
  }

  async init() {
    const db = this.env.DB;

    this.server.registerTool(
      'list_forms',
      {
        description: 'List all registered Tally forms and their public URLs on this domain.',
      },
      async () => {
        const forms = await listForms(db);
        return {
          content: [{ type: 'text', text: JSON.stringify(forms.map((f) => describe(f, this.origin())), null, 2) }],
        };
      },
    );

    this.server.registerTool(
      'get_form',
      {
        description: 'Get a registered Tally form by slug, including its generated embed code.',
        inputSchema: { slug: z.string() },
      },
      async ({ slug }) => {
        const form = await getFormBySlug(db, slug);
        if (!form) return { content: [{ type: 'text', text: `No form found for slug "${slug}".` }], isError: true };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ ...describe(form, this.origin()), embedCode: buildEmbedCode(form) }, null, 2),
            },
          ],
        };
      },
    );

    this.server.registerTool(
      'create_form',
      {
        description:
          'Register an existing Tally form so it is served publicly at https://<domain>/<slug>. ' +
          'tallyUrl accepts tally.so/r/ID, tally.so/embed/ID or tally.so/forms/ID links. ' +
          'embedType is one of: fullpage (default), standard, popup.',
        inputSchema: {
          tallyUrl: z.string().describe('URL of the existing Tally form'),
          slug: slugSchema.describe('Public path slug, e.g. "feedback" → /feedback'),
          title: z.string().max(200).optional().describe('Page title; defaults to the slug'),
          embedType: z.enum(EMBED_TYPES).optional(),
          options: optionsSchema.optional().describe(
            'Embed options: transparentBackground, trackEvents, hideTitle, alignLeft, ' +
              'dynamicHeight, height (px), width (px), overlay, emojiText, emojiAnimation, ' +
              'showOnce, doNotShowAfterSubmit, autoClose (ms)',
          ),
        },
      },
      async (input) => {
        const { record, error } = await createForm(db, input);
        if (error || !record) {
          return { content: [{ type: 'text', text: `Could not create form: ${error}` }], isError: true };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(describe(record, this.origin()), null, 2) }],
        };
      },
    );

    this.server.registerTool(
      'update_form',
      {
        description: 'Update the configuration of a registered Tally form, identified by its current slug.',
        inputSchema: {
          slug: z.string().describe('Current slug of the form to update'),
          newSlug: slugSchema.optional().describe('Rename the slug'),
          tallyUrl: z.string().optional(),
          title: z.string().max(200).optional(),
          embedType: z.enum(EMBED_TYPES).optional(),
          options: optionsSchema.optional(),
        },
      },
      async ({ slug, newSlug, ...rest }) => {
        const form = await getFormBySlug(db, slug);
        if (!form) return { content: [{ type: 'text', text: `No form found for slug "${slug}".` }], isError: true };
        const { record, error } = await updateForm(db, form, { ...rest, slug: newSlug });
        if (error || !record) {
          return { content: [{ type: 'text', text: `Could not update form: ${error}` }], isError: true };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(describe(record, this.origin()), null, 2) }],
        };
      },
    );

    this.server.registerTool(
      'delete_form',
      {
        description: 'Remove a registered Tally form. Its public URL stops working immediately.',
        inputSchema: { slug: z.string() },
      },
      async ({ slug }) => {
        const form = await getFormBySlug(db, slug);
        if (!form) return { content: [{ type: 'text', text: `No form found for slug "${slug}".` }], isError: true };
        await deleteForm(db, form.id);
        return { content: [{ type: 'text', text: `Deleted "${slug}".` }] };
      },
    );
  }
}
