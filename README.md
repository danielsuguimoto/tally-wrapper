# tally-wrapper

Serve existing Tally forms under your own domain on a Cloudflare Worker.

- Register any published Tally form (`tally.so/r/…`, `/embed/…`, `/forms/…`) and serve it publicly at `https://<your-domain>/<slug>`.
- Configuration UI mirrors Tally's own embed panel: full page / standard / popup embeds with the same options.
- Everything is stored in Cloudflare D1.
- The same capabilities are exposed as an OAuth-protected MCP server at `/mcp`, so agents can publish forms too.

## Stack

- Cloudflare Worker + [Hono](https://hono.dev) (web app, server-rendered)
- Cloudflare D1 (form configurations)
- [`agents`](https://github.com/cloudflare/agents) `McpAgent` (MCP over Streamable HTTP)
- [`@cloudflare/workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider) (OAuth 2.1 + PKCE + dynamic client registration for `/mcp`)

## Auth model

| Surface | Protection |
| --- | --- |
| `/admin/*` (management UI) | Admin password → HttpOnly session cookie (7 days) |
| `/:slug` (rendered forms) | Public |
| `/mcp` (MCP server) | OAuth 2.1. The `/authorize` page asks for the same admin password, then issues tokens. |

The OAuth authorize page accepts the admin password — single user, no external IdP needed.

## Setup

```bash
npm install
```

Create the resources and paste the IDs into `wrangler.jsonc`:

```bash
npx wrangler d1 create tally-wrapper        # → database_id
npx wrangler kv namespace create OAUTH_KV   # → id
npx wrangler secret put ADMIN_PASSWORD
npx wrangler d1 migrations apply tally-wrapper --remote
```

Deploy:

```bash
npm run deploy
```

Then point your domain at the worker (`wrangler.toml` `routes` or a custom domain in the dashboard).

## Local dev

```bash
cp .dev.vars.example .dev.vars   # set ADMIN_PASSWORD
npm run db:migrate:local
npm run dev
```

- Admin UI: http://localhost:8787/admin
- MCP: http://localhost:8787/mcp (OAuth)

## MCP tools

| Tool | Description |
| --- | --- |
| `list_forms` | List all registered forms with public URLs |
| `get_form` | Form config + generated embed code, by slug |
| `create_form` | Register a Tally form at `/<slug>` (`tallyUrl`, `slug`, `title?`, `embedType?`, `options?`) |
| `update_form` | Update config or rename the slug |
| `delete_form` | Remove a form; its URL stops working immediately |

Connect any MCP client to `https://<your-domain>/mcp` — it will run the OAuth flow, show the authorize page, and issue a token after you enter the admin password.

## Embed options

| Option | Applies to | Effect |
| --- | --- | --- |
| Transparent background | all | `transparentBackground=1` on the form URL |
| Track form events | all | Forwards `Tally.*` postMessage events to `window.dataLayer` and re-dispatches them as `CustomEvent`s on the host page |
| Standard: hide title, align left, dynamic height, height | standard | `hideTitle=1`, `alignLeft=1`, `dynamicHeight=1`, iframe height |
| Popup: width, overlay, emoji, show once, don't show after submit, auto-close | popup | `Tally.openPopup(formId, …)` options; the page auto-opens the popup |

## Notes

- `resourceMetadata` for OAuth is built per request, so any hostname serving the worker advertises the correct `/.well-known/oauth-protected-resource` document.
- Reserved slugs (`admin`, `authorize`, `token`, `register`, `mcp`, `oauth`, `sse`) can't be used for forms.
