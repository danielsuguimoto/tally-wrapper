import { EMOJI_ANIMATIONS, type FormInput } from './forms';
import type { FormRecord } from './types';
import { esc } from './embed';

const BASE_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1a1a1a; background: #fff; }
a { color: #0d6efd; text-decoration: none; }
a:hover { text-decoration: underline; }
input[type="text"], input[type="password"], input[type="url"], input[type="number"], select {
  width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid #d9d9d9; border-radius: 6px;
  background: #fff; color: #1a1a1a; outline: none;
}
input:focus, select:focus { border-color: #0d6efd; box-shadow: 0 0 0 2px rgba(13,110,253,.15); }
label { display: block; font-size: 12px; font-weight: 500; color: #555; margin-bottom: 4px; }
.btn { display: inline-block; padding: 9px 16px; font-size: 13px; font-weight: 500; border-radius: 6px;
  border: 1px solid transparent; cursor: pointer; text-align: center; }
.btn-dark { background: #000; color: #fff; border-color: #000; width: 100%; }
.btn-dark:hover { background: #222; }
.btn-outline { background: #fff; color: #1a1a1a; border-color: #d9d9d9; width: 100%; }
.btn-outline:hover { background: #f5f5f5; }
.btn-sm { width: auto; padding: 5px 12px; font-size: 12px; }
.btn-danger { color: #c00; border-color: #e5c0c0; }
.switch { position: relative; display: inline-block; width: 34px; height: 20px; flex: none; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch .track { position: absolute; inset: 0; background: #ccc; border-radius: 20px; transition: .15s; cursor: pointer; }
.switch .track::before { content: ""; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px;
  background: #fff; border-radius: 50%; transition: .15s; box-shadow: 0 1px 2px rgba(0,0,0,.25); }
.switch input:checked + .track { background: #0d6efd; }
.switch input:checked + .track::before { transform: translateX(14px); }
.opt-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }
.opt-row .opt-label { font-size: 13px; color: #1a1a1a; display: flex; align-items: center; gap: 6px; }
.help-dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid #bbb; color: #999;
  font-size: 9px; display: inline-flex; align-items: center; justify-content: center; }
.alert { padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 14px; }
.alert-error { background: #fdecec; color: #a33030; border: 1px solid #f3c1c1; }
.alert-ok { background: #e9f7ee; color: #1d6b38; border: 1px solid #bfe6cc; }
`;

export function page(title: string, body: string, extraJs = ''): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
${body}
${extraJs ? `<script>${extraJs}</script>` : ''}
</body>
</html>`;
}

export function loginPage(next: string, error?: string): string {
  return page(
    'Sign in — Tally Wrapper',
    `<div style="min-height:100%;display:flex;align-items:center;justify-content:center;background:#f6f6f6;">
  <form method="post" action="/admin/login" style="width:320px;background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:28px;">
    <h1 style="font-size:18px;margin:0 0 4px;">Tally Wrapper</h1>
    <p style="font-size:13px;color:#777;margin:0 0 18px;">Sign in with the admin password.</p>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    <input type="hidden" name="next" value="${esc(next)}" />
    <label for="pw">Admin password</label>
    <input id="pw" type="password" name="password" required autofocus style="margin-bottom:14px;" />
    <button class="btn btn-dark" type="submit">Sign in</button>
  </form>
</div>`,
  );
}

export function authorizePage(actionUrl: string, clientId: string, error?: string): string {
  return page(
    'Authorize — Tally Wrapper',
    `<div style="min-height:100%;display:flex;align-items:center;justify-content:center;background:#f6f6f6;">
  <form method="post" action="${esc(actionUrl)}" style="width:340px;background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:28px;">
    <h1 style="font-size:18px;margin:0 0 4px;">Authorize access</h1>
    <p style="font-size:13px;color:#777;margin:0 0 18px;">
      <strong>${esc(clientId)}</strong> wants to connect to the Tally Wrapper MCP server.
      Enter the admin password to authorize it.</p>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    <label for="pw">Admin password</label>
    <input id="pw" type="password" name="password" required autofocus style="margin-bottom:14px;" />
    <button class="btn btn-dark" type="submit">Authorize</button>
  </form>
</div>`,
  );
}

export function listPage(forms: FormRecord[], origin: string, flash?: string): string {
  const rows = forms
    .map(
      (f) => `<tr>
  <td><a href="/admin/forms/${f.id}/edit">${esc(f.title)}</a></td>
  <td><a href="/${esc(f.slug)}" target="_blank">/${esc(f.slug)}</a>
      <button class="btn btn-outline btn-sm" style="margin-left:6px;" data-url="${esc(origin)}/${esc(f.slug)}" onclick="navigator.clipboard.writeText(this.dataset.url);this.textContent='Copied'">Copy</button></td>
  <td style="color:#777;">${esc(f.embed_type)}</td>
  <td style="color:#777;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(f.tally_url)}</td>
  <td style="text-align:right;white-space:nowrap;">
    <form method="post" action="/admin/forms/${f.id}/delete" style="display:inline" data-confirm="Delete ${esc(f.slug)}?" onsubmit="return confirm(this.dataset.confirm)">
      <button class="btn btn-outline btn-sm btn-danger" type="submit">Delete</button>
    </form>
  </td>
</tr>`,
    )
    .join('');
  const empty = `<tr><td colspan="5" style="padding:40px 0;text-align:center;color:#888;">
    No forms yet. <a href="/admin/forms/new">Add your first Tally form</a>.</td></tr>`;
  return page(
    'Forms — Tally Wrapper',
    `<header style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid #e8e8e8;">
  <strong style="font-size:15px;">Tally Wrapper</strong>
  <div>
    <a class="btn btn-outline btn-sm" href="/admin/forms/new" style="margin-right:8px;">New form</a>
    <form method="post" action="/admin/logout" style="display:inline"><button class="btn btn-outline btn-sm" type="submit">Sign out</button></form>
  </div>
</header>
<main style="max-width:980px;margin:0 auto;padding:28px 24px;">
  <h1 style="font-size:20px;margin:0 0 18px;">Forms</h1>
  ${flash ? `<div class="alert alert-ok">${esc(flash)}</div>` : ''}
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr style="text-align:left;color:#888;font-size:12px;">
      <th style="padding:8px 0;border-bottom:1px solid #eee;">Title</th>
      <th style="padding:8px 0;border-bottom:1px solid #eee;">Public URL</th>
      <th style="padding:8px 0;border-bottom:1px solid #eee;">Type</th>
      <th style="padding:8px 0;border-bottom:1px solid #eee;">Tally form</th>
      <th style="padding:8px 0;border-bottom:1px solid #eee;"></th>
    </tr></thead>
    <tbody>${rows || empty}</tbody>
  </table>
</main>`,
  );
}

function toggle(name: string, label: string, checked: boolean): string {
  return `<div class="opt-row">
  <span class="opt-label">${esc(label)}<span class="help-dot">?</span></span>
  <span class="switch"><input type="checkbox" name="${esc(name)}"${checked ? ' checked' : ''} /><span class="track" onclick="this.previousElementSibling.click()"></span></span>
</div>`;
}

export function editorPage(
  form: FormRecord | null,
  origin: string,
  error?: string,
  flash?: string,
): string {
  const o = form?.options;
  const f = {
    tallyUrl: form?.tally_url ?? '',
    slug: form?.slug ?? '',
    title: form && form.title !== form.slug ? form.title : '',
    embedType: form?.embed_type ?? 'fullpage',
  };
  const checked = (v: boolean | undefined, def: boolean) => (v === undefined ? def : v);
  const action = form ? `/admin/forms/${form.id}` : '/admin/forms';
  const emojiAnimOptions = EMOJI_ANIMATIONS.map(
    (a) =>
      `<option value="${a}"${o?.emojiAnimation === a ? ' selected' : ''}>${a === 'none' ? 'None' : a}</option>`,
  ).join('');

  const body = `
<div style="display:flex;height:100%;">
  <aside style="width:320px;flex:none;border-right:1px solid #e3e3e3;overflow-y:auto;background:#fff;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eee;">
      <strong style="font-size:14px;">${form ? 'Edit form' : 'New form'}</strong>
      <a href="/admin" style="font-size:12px;color:#888;">Close</a>
    </div>
    <form id="editor" method="post" action="${action}" style="padding:0 16px 24px;">
      <input type="hidden" name="payload" id="payload" />
      ${error ? `<div class="alert alert-error" style="margin-top:14px;">${esc(error)}</div>` : ''}
      ${flash ? `<div class="alert alert-ok" style="margin-top:14px;">${esc(flash)}</div>` : ''}
      <div style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
        <div style="margin-bottom:10px;">
          <label for="tallyUrl">Tally form URL *</label>
          <input id="tallyUrl" type="text" name="tallyUrl" placeholder="https://tally.so/r/xxxxxx" value="${esc(f.tallyUrl)}" required />
        </div>
        <div style="margin-bottom:10px;">
          <label for="slug">Slug *</label>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:12px;color:#999;white-space:nowrap;">${esc(new URL(origin).host)}/</span>
            <input id="slug" type="text" name="slug" placeholder="feedback" value="${esc(f.slug)}" required />
          </div>
        </div>
        <div>
          <label for="title">Title</label>
          <input id="title" type="text" name="title" placeholder="Used for the page title" value="${esc(f.title)}" />
        </div>
      </div>
      <div style="padding:14px 0;border-bottom:1px solid #f0f0f0;">
        <label for="embedType">Embed</label>
        <select id="embedType" name="embedType" style="margin-bottom:10px;">
          <option value="fullpage"${f.embedType === 'fullpage' ? ' selected' : ''}>Full page</option>
          <option value="standard"${f.embedType === 'standard' ? ' selected' : ''}>Standard</option>
          <option value="popup"${f.embedType === 'popup' ? ' selected' : ''}>Popup</option>
        </select>
        <button class="btn btn-dark" type="button" id="getCode" style="margin-bottom:8px;">&lt;/&gt; Get the code</button>
        <button class="btn btn-outline" type="submit">Save form</button>
      </div>
      <div style="padding:10px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <strong style="font-size:13px;">Options</strong>
          <span style="font-size:11px;color:#999;">ⓘ Help</span>
        </div>
        ${toggle('transparentBackground', 'Transparent background', checked(o?.transparentBackground, false))}
        ${toggle('trackEvents', 'Track form events', checked(o?.trackEvents, false))}
        <div id="opts-standard" style="display:none;margin-top:6px;border-top:1px solid #f0f0f0;padding-top:6px;">
          <div style="font-size:11px;color:#999;margin-bottom:2px;">Standard options</div>
          ${toggle('hideTitle', 'Hide form title', checked(o?.hideTitle, false))}
          ${toggle('alignLeft', 'Align content to the left', checked(o?.alignLeft, false))}
          ${toggle('dynamicHeight', 'Dynamic height', checked(o?.dynamicHeight, false))}
          <div style="margin:6px 0 4px;"><label for="height">Height (px)</label>
            <input id="height" type="number" name="height" min="100" max="5000" placeholder="600" value="${o?.height ?? ''}" /></div>
        </div>
        <div id="opts-popup" style="display:none;margin-top:6px;border-top:1px solid #f0f0f0;padding-top:6px;">
          <div style="font-size:11px;color:#999;margin-bottom:2px;">Popup options</div>
          <div style="margin:6px 0 4px;"><label for="width">Width (px)</label>
            <input id="width" type="number" name="width" min="200" max="1600" placeholder="376" value="${o?.width ?? ''}" /></div>
          ${toggle('hideTitle', 'Hide form title', checked(o?.hideTitle, false))}
          ${toggle('alignLeft', 'Align content to the left', checked(o?.alignLeft, false))}
          ${toggle('overlay', 'Dark overlay', checked(o?.overlay, true))}
          <div style="margin:6px 0 4px;"><label for="emojiText">Emoji</label>
            <input id="emojiText" type="text" name="emojiText" maxlength="8" placeholder="👋" value="${esc(o?.emojiText ?? '')}" /></div>
          <div style="margin:6px 0 4px;"><label for="emojiAnimation">Emoji animation</label>
            <select id="emojiAnimation" name="emojiAnimation">${emojiAnimOptions}</select></div>
          ${toggle('showOnce', 'Show only once', checked(o?.showOnce, false))}
          ${toggle('doNotShowAfterSubmit', "Don't show after submit", checked(o?.doNotShowAfterSubmit, true))}
          <div style="margin:6px 0 4px;"><label for="autoClose">Auto-close after submit (ms)</label>
            <input id="autoClose" type="number" name="autoClose" min="0" max="600000" placeholder="e.g. 3000" value="${o?.autoClose ?? ''}" /></div>
        </div>
      </div>
    </form>
  </aside>
  <main id="pane" style="flex:1;position:relative;background:#f6f6f6;overflow:auto;">
    <div id="preview" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
      <div id="previewInner" style="width:100%;height:100%;"></div>
    </div>
    <div id="code" style="display:none;position:absolute;inset:0;background:#1c1c24;color:#d7d7e0;overflow:auto;">
      <div style="max-width:840px;margin:0 auto;padding:28px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <strong style="font-size:15px;color:#fff;">Embed code</strong>
          <button class="btn btn-outline btn-sm" id="backToPreview" type="button" style="background:transparent;color:#ccc;border-color:#444;">Back to preview</button>
        </div>
        <p style="font-size:13px;color:#9a9aad;line-height:1.5;">Copy the code below and paste it in your web page's HTML.
        This is the exact markup served at your public URL.</p>
        <pre id="codeBlock" style="background:#14141b;border:1px solid #2c2c38;border-radius:8px;padding:16px;font-size:12px;line-height:1.55;overflow:auto;white-space:pre-wrap;word-break:break-all;color:#a9dc76;"></pre>
        <button class="btn btn-outline btn-sm" id="copyCode" type="button" style="width:auto;background:transparent;color:#ccc;border-color:#444;">Copy code</button>
      </div>
    </div>
  </main>
</div>`;

  const js = `
(function () {
  var els = {
    tallyUrl: document.getElementById('tallyUrl'),
    slug: document.getElementById('slug'),
    title: document.getElementById('title'),
    embedType: document.getElementById('embedType'),
    preview: document.getElementById('preview'),
    previewInner: document.getElementById('previewInner'),
    code: document.getElementById('code'),
    codeBlock: document.getElementById('codeBlock'),
  };
  var tallyScriptLoaded = false;
  function loadTally(cb) {
    if (window.Tally) return cb();
    if (tallyScriptLoaded) { var t = setInterval(function(){ if (window.Tally) { clearInterval(t); cb(); } }, 100); return; }
    tallyScriptLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://tally.so/widgets/embed.js';
    s.onload = cb;
    document.head.appendChild(s);
  }
  function collect() {
    var num = function (id) { var v = document.getElementById(id).value.trim(); return v === '' ? null : Number(v); };
    var bool = function (name) { var el = document.querySelector('input[name="' + name + '"]'); return el ? el.checked : false; };
    var boolIn = function (container, name) { var el = document.querySelector('#' + container + ' input[name="' + name + '"]'); return el ? el.checked : false; };
    var type = els.embedType.value;
    var options = {
      transparentBackground: bool('transparentBackground'),
      trackEvents: bool('trackEvents'),
      hideTitle: false, alignLeft: false, dynamicHeight: false,
      height: null, width: null, overlay: true, emojiText: '', emojiAnimation: 'none',
      showOnce: false, doNotShowAfterSubmit: false, autoClose: null
    };
    if (type === 'standard') {
      options.hideTitle = boolIn('opts-standard', 'hideTitle');
      options.alignLeft = boolIn('opts-standard', 'alignLeft');
      options.dynamicHeight = boolIn('opts-standard', 'dynamicHeight');
      options.height = num('height');
    } else if (type === 'popup') {
      options.hideTitle = boolIn('opts-popup', 'hideTitle');
      options.alignLeft = boolIn('opts-popup', 'alignLeft');
      options.overlay = boolIn('opts-popup', 'overlay');
      options.width = num('width');
      options.emojiText = document.getElementById('emojiText').value.trim();
      options.emojiAnimation = document.getElementById('emojiAnimation').value;
      options.showOnce = boolIn('opts-popup', 'showOnce');
      options.doNotShowAfterSubmit = boolIn('opts-popup', 'doNotShowAfterSubmit');
      options.autoClose = num('autoClose');
    }
    return {
      tallyUrl: els.tallyUrl.value.trim(),
      slug: els.slug.value.trim(),
      title: els.title.value.trim(),
      embedType: type,
      options: options
    };
  }
  var current = null;
  function refresh() {
    var type = els.embedType.value;
    document.getElementById('opts-standard').style.display = type === 'standard' ? 'block' : 'none';
    document.getElementById('opts-popup').style.display = type === 'popup' ? 'block' : 'none';
    var input = collect();
    if (!input.tallyUrl) {
      els.previewInner.innerHTML = '<p style="text-align:center;color:#999;font-size:14px;padding:24px;">Enter a Tally form URL to preview it here.</p>';
      current = null;
      return;
    }
    fetch('/admin/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.error) {
        els.previewInner.innerHTML = '<p style="text-align:center;color:#c00;font-size:14px;padding:24px;"></p>';
        els.previewInner.firstChild.textContent = res.error;
        current = null;
        return;
      }
      current = res;
      if (els.code.style.display !== 'none') els.codeBlock.textContent = res.code;
      if (res.embedType === 'popup') {
        els.previewInner.innerHTML =
          '<div style="height:100%;display:flex;align-items:center;justify-content:center;">' +
          '<button type="button" class="btn btn-dark" style="width:auto;padding:12px 28px;" id="previewPopup">Preview popup</button></div>';
        document.getElementById('previewPopup').onclick = function () {
          loadTally(function () { Tally.openPopup(res.formId, res.popupOpts); });
        };
      } else {
        var h = res.embedType === 'standard' ? 'height:' + (input.options.height || 600) + 'px;' : 'height:100%;';
        els.previewInner.innerHTML =
          '<div style="' + (res.embedType === 'standard' ? 'max-width:700px;margin:0 auto;padding:24px;' : 'width:100%;height:100%;') + '">' +
          '<iframe data-tally-src="' + res.previewSrc + '" loading="lazy" width="100%" style="' + h + 'border:0;" frameborder="0" marginheight="0" marginwidth="0"></iframe></div>';
        loadTally(function () { Tally.loadEmbeds(); });
      }
    }).catch(function () { current = null; });
  }
  var debounce;
  function schedule() { clearTimeout(debounce); debounce = setTimeout(refresh, 350); }
  document.getElementById('editor').addEventListener('input', schedule);
  document.getElementById('editor').addEventListener('change', schedule);
  document.getElementById('editor').addEventListener('submit', function (e) {
    document.getElementById('payload').value = JSON.stringify(collect());
  });
  document.getElementById('getCode').addEventListener('click', function () {
    if (!els.tallyUrl.value.trim()) { els.tallyUrl.focus(); return; }
    els.preview.style.display = 'none';
    els.code.style.display = 'block';
    if (current) { els.codeBlock.textContent = current.code; return; }
    var input = collect();
    fetch('/admin/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      .then(function (r) { return r.json(); })
      .then(function (res) { current = res; els.codeBlock.textContent = res.error || res.code; });
  });
  document.getElementById('backToPreview').addEventListener('click', function () {
    els.code.style.display = 'none';
    els.preview.style.display = 'flex';
    refresh();
  });
  document.getElementById('copyCode').addEventListener('click', function () {
    navigator.clipboard.writeText(els.codeBlock.textContent);
    this.textContent = 'Copied';
  });
  refresh();
})();`;

  return page(form ? `Edit ${form.slug} — Tally Wrapper` : 'New form — Tally Wrapper', body, js);
}
