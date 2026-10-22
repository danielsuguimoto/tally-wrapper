import type { FormRecord } from './types';

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function iframeSrc(form: FormRecord): string {
  const o = form.options;
  const params = new URLSearchParams();
  const base =
    form.embed_type === 'standard'
      ? `https://tally.so/embed/${form.form_id}`
      : `https://tally.so/r/${form.form_id}`;
  if (o.transparentBackground) params.set('transparentBackground', '1');
  if (form.embed_type === 'standard') {
    if (o.hideTitle) params.set('hideTitle', '1');
    if (o.alignLeft) params.set('alignLeft', '1');
    if (o.dynamicHeight) params.set('dynamicHeight', '1');
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function popupOptionsJson(form: FormRecord): string {
  const o = form.options;
  const opts: Record<string, unknown> = { layout: 'modal' };
  if (o.width) opts.width = o.width;
  if (!o.overlay) opts.overlay = false;
  if (o.hideTitle) opts.hideTitle = true;
  if (o.alignLeft) opts.alignLeft = true;
  if (o.emojiText) opts.emoji = { text: o.emojiText, animation: o.emojiAnimation };
  if (o.autoClose) opts.autoClose = o.autoClose;
  if (o.showOnce) opts.showOnce = true;
  if (o.doNotShowAfterSubmit) opts.doNotShowAfterSubmit = true;
  return JSON.stringify(opts).replace(/</g, '\\u003c');
}

const TRUSTED_ORIGIN = 'https://tally.so';
const TRACK_EVENTS_SCRIPT = `<script>
window.dataLayer = window.dataLayer || [];
window.addEventListener('message', function (e) {
  if (e.origin !== '${TRUSTED_ORIGIN}' || typeof e.data !== 'string' || e.data.indexOf('Tally.') === -1) return;
  try {
    var msg = JSON.parse(e.data);
    window.dataLayer.push(msg);
    window.dispatchEvent(new CustomEvent(msg.event, { detail: msg.payload }));
  } catch (err) {}
});
</script>`;

export function buildEmbedCode(form: FormRecord): string {
  const o = form.options;
  const title = esc(form.title);
  const track = o.trackEvents ? `\n${TRACK_EVENTS_SCRIPT}` : '';

  if (form.embed_type === 'popup') {
    return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
<meta name="color-scheme" content="only light" />
<title>${title}</title>
<script async src="https://tally.so/widgets/embed.js"></script>
<style type="text/css">
html { margin: 0; height: 100%; background: #f3f3f3; }
body { margin: 0; height: 100%; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f3f3f3; }
button { padding: 12px 24px; font-size: 15px; font-weight: 500; color: #fff; background: #000; border: 0; border-radius: 8px; cursor: pointer; }
</style>
</head>
<body>
<button type="button" onclick="openForm()">${o.emojiText ? `${esc(o.emojiText)} ` : ''}${title}</button>
<script>
function openForm() { Tally.openPopup(${JSON.stringify(form.form_id)}, ${popupOptionsJson(form)}); }
window.addEventListener('load', function () { openForm(); });
</script>${track}
</body>
</html>`;
  }

  if (form.embed_type === 'standard') {
    const height = o.height ?? 600;
    return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
<meta name="color-scheme" content="only light" />
<title>${title}</title>
<script async src="https://tally.so/widgets/embed.js"></script>
<style type="text/css">
html { margin: 0; background: #fff; }
body { margin: 0; padding: 24px;${o.transparentBackground ? '' : ' background: #fff;'} }
.wrap { max-width: 700px; margin: 0 auto; }
</style>
</head>
<body>
<div class="wrap">
<iframe data-tally-src="${iframeSrc(form)}" loading="lazy" width="100%" height="${height}" frameborder="0" marginheight="0" marginwidth="0" title="${title}"></iframe>
</div>${track}
</body>
</html>`;
  }

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
<meta name="color-scheme" content="only light" />
<title>${title}</title>
<script async src="https://tally.so/widgets/embed.js"></script>
<style type="text/css">
html { margin: 0; height: 100%; overflow: hidden; background: #fff; }
iframe { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border: 0; }
</style>
</head>
<body>
<iframe data-tally-src="${iframeSrc(form)}" width="100%" height="100%" frameborder="0" marginheight="0" marginwidth="0" title="${title}"></iframe>${track}
</body>
</html>`;
}
