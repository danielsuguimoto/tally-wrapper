import { Hono, type Context } from 'hono';
import { CimdFetchError } from '@cloudflare/workers-oauth-provider';
import { clientMetadataUnavailable, fetchOAuth } from './oauth';
import type { Env, FormRecord } from './types';
import { TallyMCP } from './mcp';
import {
  createForm,
  deleteForm,
  getFormById,
  getFormBySlug,
  listForms,
  normalizeOptions,
  optionsSchema,
  parseTallyUrl,
  updateForm,
} from './forms';
import { buildEmbedCode, iframeSrc, popupOptionsJson } from './embed';
import {
  createSessionValue,
  readCookie,
  requireAdmin,
  SESSION_COOKIE,
  verifyPassword,
  verifySessionValue,
} from './auth';
import { authorizePage, editorPage, listPage, loginPage } from './ui';

const app = new Hono<{ Bindings: Env }>();

app.get('/authorize', async (c) => {
  let authReq;
  try {
    authReq = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  } catch (error) {
    if (error instanceof CimdFetchError) return clientMetadataUnavailable();
    return c.text('Invalid authorization request', 400);
  }
  return c.html(authorizePage(c.req.url, authReq.clientId));
});

app.post('/authorize', async (c) => {
  let authReq;
  try {
    authReq = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  } catch (error) {
    if (error instanceof CimdFetchError) return clientMetadataUnavailable();
    return c.text('Invalid authorization request', 400);
  }
  const body = await c.req.parseBody();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!(await verifyPassword(password, c.env.ADMIN_PASSWORD))) {
    return c.html(authorizePage(c.req.url, authReq.clientId, 'Wrong password'), 401);
  }
  try {
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      request: authReq,
      userId: 'admin',
      metadata: { label: 'Admin' },
      scope: authReq.scope,
      props: { userId: 'admin', origin: new URL(c.req.url).origin },
    });
    return c.redirect(redirectTo, 302);
  } catch (error) {
    if (error instanceof CimdFetchError) return clientMetadataUnavailable();
    throw error;
  }
});

app.get('/admin/login', async (c) => {
  const next = c.req.query('next') ?? '/admin';
  const cookie = readCookie(c.req.header('cookie'), SESSION_COOKIE);
  if (cookie && (await verifySessionValue(c.env.ADMIN_PASSWORD, cookie))) {
    return c.redirect(safeNext(next));
  }
  return c.html(loginPage(next));
});

app.post('/admin/login', async (c) => {
  const body = await c.req.parseBody();
  const next = typeof body.next === 'string' ? body.next : '/admin';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!(await verifyPassword(password, c.env.ADMIN_PASSWORD))) {
    return c.html(loginPage(next, 'Wrong password'), 401);
  }
  const session = await createSessionValue(c.env.ADMIN_PASSWORD);
  return new Response(null, {
    status: 302,
    headers: {
      Location: safeNext(next),
      'Set-Cookie': `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
    },
  });
});

app.post('/admin/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
});

function safeNext(next: string): string {
  return next.startsWith('/') && !next.startsWith('//') && !/[\r\n]/.test(next) ? next : '/admin';
}

app.use('/admin/*', requireAdmin);
app.use('/admin', requireAdmin);

app.get('/admin', async (c) => {
  const forms = await listForms(c.env.DB);
  return c.html(listPage(forms, new URL(c.req.url).origin, c.req.query('saved') ? 'Saved.' : undefined));
});

app.get('/admin/forms/new', (c) => {
  return c.html(editorPage(null, new URL(c.req.url).origin));
});

app.post('/admin/forms', async (c) => {
  const { input, error: parseError } = await readPayload(c);
  if (parseError || !input) return c.html(editorPage(null, new URL(c.req.url).origin, parseError), 400);
  const { record, error } = await createForm(c.env.DB, input);
  if (error || !record) return c.html(editorPage(null, new URL(c.req.url).origin, error), 400);
  return c.redirect(`/admin/forms/${record.id}/edit?saved=1`);
});

app.get('/admin/forms/:id/edit', async (c) => {
  const form = await getFormById(c.env.DB, c.req.param('id'));
  if (!form) return c.notFound();
  return c.html(editorPage(form, new URL(c.req.url).origin, undefined, c.req.query('saved') ? 'Saved.' : undefined));
});

app.post('/admin/forms/:id', async (c) => {
  const form = await getFormById(c.env.DB, c.req.param('id'));
  if (!form) return c.notFound();
  const { input, error: parseError } = await readPayload(c);
  if (parseError || !input) return c.html(editorPage(form, new URL(c.req.url).origin, parseError), 400);
  const { record, error } = await updateForm(c.env.DB, form, {
    tallyUrl: input.tallyUrl,
    slug: input.slug,
    title: input.title,
    embedType: input.embedType,
    options: input.options,
  });
  if (error || !record) return c.html(editorPage(form, new URL(c.req.url).origin, error), 400);
  return c.redirect(`/admin/forms/${record.id}/edit?saved=1`);
});

app.post('/admin/forms/:id/delete', async (c) => {
  await deleteForm(c.env.DB, c.req.param('id'));
  return c.redirect('/admin');
});

app.post('/admin/preview', async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  const body = raw as Record<string, unknown>;
  const optionsParsed = optionsSchema.safeParse(body.options ?? {});
  if (!optionsParsed.success) return c.json({ error: 'Invalid options' }, 400);
  let formId: string;
  let canonicalUrl: string;
  try {
    ({ formId, canonicalUrl } = parseTallyUrl(String(body.tallyUrl ?? '')));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Invalid Tally form URL' }, 400);
  }
  const embedType = ['fullpage', 'standard', 'popup'].includes(String(body.embedType))
    ? (String(body.embedType) as FormRecord['embed_type'])
    : 'fullpage';
  const slug = typeof body.slug === 'string' && body.slug ? body.slug : 'preview';
  const rec: FormRecord = {
    id: 'preview',
    slug,
    title: (typeof body.title === 'string' && body.title.trim()) || slug,
    tally_url: canonicalUrl,
    form_id: formId,
    embed_type: embedType,
    options: normalizeOptions(optionsParsed.data),
    created_at: '',
    updated_at: '',
  };
  return c.json({
    code: buildEmbedCode(rec),
    previewSrc: iframeSrc(rec),
    popupOpts: JSON.parse(popupOptionsJson(rec)),
    formId,
    embedType,
  });
});

async function readPayload(c: Context) {
  const body = await c.req.parseBody();
  try {
    return { input: JSON.parse(String(body.payload ?? '{}')) };
  } catch {
    return { input: null, error: 'Invalid form payload' };
  }
}

app.get('/', (c) => c.redirect('/admin'));
app.get('/favicon.ico', (c) => c.body(null, 204));

app.get('/:slug', async (c) => {
  const form = await getFormBySlug(c.env.DB, c.req.param('slug'));
  if (!form) return c.notFound();
  return c.html(buildEmbedCode(form));
});

export { TallyMCP };

const mcpHandler = TallyMCP.serve('/mcp');

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const origin = new URL(request.url).origin;
    return fetchOAuth(request, env, ctx, {
      apiRoute: '/mcp',
      apiHandler: mcpHandler,
      defaultHandler: app,
      authorizeEndpoint: '/authorize',
      tokenEndpoint: '/token',
      clientRegistrationEndpoint: '/register',
      clientIdMetadataDocumentEnabled: true,
      resourceMetadata: {
        resource: `${origin}/mcp`,
        authorization_servers: [origin],
      },
    });
  },
} satisfies ExportedHandler<Env>;
