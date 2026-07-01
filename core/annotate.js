/* vibepin overlay — framework-agnostic, zero-dependency.
 * Toggle with ⌥A / Alt+A. The gesture decides the kind — no mode switch:
 *   - Click an element      → element annotation (hover-highlights first).
 *   - Drag a box (>5px move) → region annotation (the area + elements inside).
 * Batch-send to the daemon.
 *
 * React-aware: if a React dev build is detected, annotations carry the component
 * name and source file:line (from the fiber's _debugSource, or a data-source
 * attribute as a fallback for React 19 / inspector plugins). Falls back to a CSS
 * selector when there is no React.
 *
 * Screenshot is pluggable: if window.__vibepinCapture(rect) is defined
 * (e.g. Electron preload using webContents.capturePage), it is awaited and the
 * returned data URL is attached.
 */
(() => {
  if (window.__vibepin) {
    window.__vibepin.toggle();
    return;
  }

  // Demo mode (e.g. the hosted landing page): no daemon — Send just shows a toast.
  const DEMO = !!window.__vibepinDemo;

  const ENDPOINT =
    (document.currentScript && new URL(document.currentScript.src).origin) ||
    'http://127.0.0.1:7331';

  const STYLE_KEYS = [
    'display', 'position', 'boxSizing', 'width', 'height',
    'margin', 'padding', 'color', 'backgroundColor', 'border', 'borderRadius',
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
    'textAlign', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'gridTemplateColumns', 'opacity', 'boxShadow', 'zIndex',
  ];

  const pending = [];
  let on = false;
  let hovered = null;
  let down = null;            // pointer-down origin — decides click vs drag
  let drawing = false;
  let start = null;
  let suppressClick = false;  // swallow the click that ends a drag
  let panelDrag = null;       // dragging the floating panel to reposition
  let settingsOpen = false;

  // ---- i18n --------------------------------------------------------------
  const I18N = {
    zh: {
      annotate: '标注', annotating: '标注中',
      modeOn: '标注模式开 (⌥A / Esc 退出)', modeOff: '标注模式关',
      sent: (n) => `已发送 ${n} 条,Claude Code 会处理`, sendFail: '发送失败:',
      demoSent: '演示:真实项目里这会发给你的 AI agent 去改代码。',
      copy: '复制', copied: (n) => `已复制 ${n} 条,粘贴给你的 AI agent`, copyFail: '复制失败,请手动选择文本',
      copyIntro: '请按这些 UI 修改要求改代码:',
      empty: '还没有标注,点击或拖拽开始。',
      ph: '改这里要做什么?', cancel: '取消', add: '添加', save: '保存',
      count: (n) => `${n} 条`,
      tDrag: '拖动', tStatus: 'daemon 连接状态', tHide: '隐藏 · ⌥A 重新打开',
      tAnno: '进入/退出标注 (⌥A)', tEdit: '点击编辑', tRemove: '删除', tSettings: '设置',
      sOk: 'daemon 已连接', sNoResp: 'daemon 无响应', sNo: 'daemon 未连接',
      noNote: '(无备注)', region: (w, h, n) => `▦ 区域 ${w}×${h} · ${n} 元素`,
      lang: '语言', shortcuts: '快捷键', theme: '主题', dark: '暗色', light: '浅色',
      g: [['⌥A', '开关标注'], ['点击', '标注单个元素'], ['拖拽', '框选一片区域'],
          ['点钉 / 行', '编辑备注'], ['Esc', '退出标注'], ['Send', '发给 Claude Code']],
    },
    en: {
      annotate: 'Annotate', annotating: 'Annotating',
      modeOn: 'Annotate mode on (⌥A / Esc to exit)', modeOff: 'Annotate mode off',
      sent: (n) => `Sent ${n}. Claude Code will pick it up.`, sendFail: 'Send failed: ',
      demoSent: 'Demo — in a real project this goes to your AI agent to edit the code.',
      copy: 'Copy', copied: (n) => `Copied ${n} — paste into your AI agent.`, copyFail: 'Copy failed — select the text manually.',
      copyIntro: 'Apply these UI change requests:',
      empty: 'No annotations yet — click or drag to start.',
      ph: 'What should change here?', cancel: 'Cancel', add: 'Add', save: 'Save',
      count: (n) => `${n}`,
      tDrag: 'Drag', tStatus: 'daemon status', tHide: 'Hide · ⌥A to reopen',
      tAnno: 'Toggle annotate (⌥A)', tEdit: 'Click to edit', tRemove: 'Remove', tSettings: 'Settings',
      sOk: 'daemon connected', sNoResp: 'daemon not responding', sNo: 'daemon not connected',
      noNote: '(no note)', region: (w, h, n) => `▦ Region ${w}×${h} · ${n} elements`,
      lang: 'Language', shortcuts: 'Shortcuts', theme: 'Theme', dark: 'Dark', light: 'Light',
      g: [['⌥A', 'Toggle annotate'], ['Click', 'Annotate an element'], ['Drag', 'Select a region'],
          ['Pin / Row', 'Edit note'], ['Esc', 'Exit annotate'], ['Send', 'Hand off to Claude Code']],
    },
  };
  let lang = localStorage.getItem('__vibepin_lang') ||
    (String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  const t = (k) => (I18N[lang] && I18N[lang][k] != null ? I18N[lang][k] : I18N.zh[k]);
  let theme = localStorage.getItem('__vibepin_theme') || 'dark';

  // ---- UI ----------------------------------------------------------------
  const root = document.createElement('div');
  root.id = '__vibepin_root';
  root.setAttribute('data-theme', theme);
  const shadow = root.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(root);

  shadow.innerHTML = `
  <style>
    :host { all: initial;
      --ov-bg:#161616; --ov-bg2:#0f0f0f; --ov-border:#2c2c2c; --ov-border2:#262626; --ov-row:#1f1f1f;
      --ov-text:#e8e8e8; --ov-muted:#9a9a9a; --ov-faint:#6f6f6f; --ov-chip:#222; --ov-chip-text:#cfcfcf;
      --ov-accent:#f5c518; --ov-ink:#1a1a1a; --ov-accent-ink:#f5c518; --ov-sel:#7a8aa0; --ov-cmp:#8bd5a0;
      --ov-seton:#2b2b2b; --ov-shadow:0 12px 40px rgba(0,0,0,.55); }
    :host([data-theme="light"]) {
      --ov-bg:#ffffff; --ov-bg2:#f3f3f5; --ov-border:#e3e3e8; --ov-border2:#ededf0; --ov-row:#eeeef1;
      --ov-text:#1a1a1a; --ov-muted:#6a6a73; --ov-faint:#9a9aa3; --ov-chip:#eef0f2; --ov-chip-text:#33333a;
      --ov-accent:#f5c518; --ov-ink:#161300; --ov-accent-ink:#8a6a00; --ov-sel:#5a6b85; --ov-cmp:#2e7d4f;
      --ov-seton:#ececf0; --ov-shadow:0 12px 36px rgba(0,0,0,.18); }
    *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    .hl{position:fixed;pointer-events:none;z-index:2147483640;border:2px solid #f5c518;
        background:rgba(245,197,24,.16);border-radius:3px;transition:all .04s linear}
    .band{position:fixed;pointer-events:none;z-index:2147483640;border:2px dashed #f5c518;
          background:rgba(245,197,24,.16);border-radius:2px}
    .tag{position:fixed;z-index:2147483641;pointer-events:none;background:var(--ov-accent);color:var(--ov-ink);
         font-size:11px;padding:2px 6px;border-radius:4px;white-space:nowrap;max-width:60vw;overflow:hidden;text-overflow:ellipsis}
    .panel{position:fixed;right:16px;top:16px;z-index:2147483642;width:auto;
           background:var(--ov-bg);color:var(--ov-text);border:1px solid var(--ov-border);border-radius:12px;
           box-shadow:var(--ov-shadow);overflow:hidden}
    .panel.open{width:300px}
    .phead{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:grab;user-select:none}
    .phead:active{cursor:grabbing}
    .grip{display:flex;align-items:center;color:var(--ov-faint);cursor:grab}
    .atog{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;height:28px;background:var(--ov-chip);color:var(--ov-chip-text);padding:0 12px 0 10px;font-size:12px;border-radius:7px}
    .atog.on{background:var(--ov-accent);color:var(--ov-ink);font-weight:600}
    .grip svg,.atog svg,.setbtn svg,.hidebtn svg{display:block}
    .count{font-size:11px;color:var(--ov-muted);margin-left:auto}
    .hidebtn{flex:0 0 auto;height:28px;display:inline-grid;place-items:center;background:transparent;color:var(--ov-faint);padding:0 7px;border-radius:7px}
    .hidebtn:hover{color:#e05656}
    .setbtn{flex:0 0 auto;height:28px;display:inline-grid;place-items:center;background:transparent;color:var(--ov-muted);padding:0 7px;border-radius:7px}
    .setbtn:hover{color:var(--ov-text)}
    .setbtn.on{background:var(--ov-accent);color:var(--ov-ink)}
    .settings{padding:10px 12px;border-top:1px solid var(--ov-border2)}
    .setrow{display:flex;align-items:center;justify-content:space-between}
    .setrow+.setrow{margin-top:10px}
    .langlabel{font-size:11px;color:var(--ov-faint)}
    .seg2{display:inline-flex;gap:2px;background:var(--ov-chip);border-radius:8px;padding:2px}
    .seg2 button{flex:0 0 auto;background:transparent;color:var(--ov-muted);padding:3px 11px;font-size:11px;border-radius:6px}
    .seg2 button.on{background:var(--ov-accent);color:var(--ov-ink);font-weight:600}
    .setdiv{height:1px;background:var(--ov-border2);margin:12px 0}
    .setgt{color:var(--ov-faint);font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
    .guide{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center}
    .gkey{justify-self:start;padding:3px 9px;background:var(--ov-chip);border-radius:6px;
          font:11px/1.5 ui-monospace,Menlo,monospace;color:var(--ov-text);white-space:nowrap}
    .gdesc{color:var(--ov-muted);font-size:12px}
    .status{width:8px;height:8px;border-radius:50%;background:#555;flex:0 0 auto}
    .status.ok{background:#36d399}
    .pin{position:fixed;z-index:2147483641;transform:translate(-50%,-50%);min-width:18px;height:18px;padding:0 4px;
         border-radius:9px;background:#f5c518;color:#1a1a1a;font-size:11px;font-weight:700;line-height:18px;
         text-align:center;cursor:pointer;pointer-events:auto;box-shadow:0 1px 3px rgba(0,0,0,.22)}
    .body{border-top:1px solid var(--ov-border2)}
    .list{max-height:240px;overflow:auto}
    .row{padding:8px 12px;border-bottom:1px solid var(--ov-row);display:flex;gap:8px;align-items:flex-start}
    .row .sel{font-size:10px;color:var(--ov-sel);font-family:ui-monospace,Menlo,monospace;word-break:break-all}
    .row .cmp{color:var(--ov-cmp)}
    .row .nt{font-size:12px;color:var(--ov-text);margin-top:2px}
    .row .x{margin-left:auto;color:var(--ov-muted);cursor:pointer;pointer-events:auto;font-size:14px;line-height:1}
    .row .x:hover{color:#e05656}
    .pinno{flex:0 0 auto;width:16px;height:16px;border-radius:8px;background:var(--ov-accent);color:var(--ov-ink);font-size:10px;font-weight:700;line-height:16px;text-align:center}
    .foot{display:flex;gap:8px;padding:10px 12px}
    button{flex:1;border:0;border-radius:8px;padding:9px;font-size:13px;cursor:pointer;pointer-events:auto}
    .send{background:var(--ov-accent);color:var(--ov-ink);font-weight:600}
    .send:disabled{background:var(--ov-chip);color:var(--ov-faint);cursor:default}
    .clear{background:var(--ov-chip);color:var(--ov-text)}
    .copy{background:var(--ov-chip);color:var(--ov-text)}
    .copy:disabled{color:var(--ov-faint);cursor:default}
    .empty{padding:16px 12px;color:var(--ov-faint);font-size:11px;text-align:center;white-space:nowrap}
    .pop{position:fixed;z-index:2147483643;width:280px;background:var(--ov-bg);border:1px solid var(--ov-border);
         border-radius:10px;box-shadow:var(--ov-shadow);padding:10px;pointer-events:auto}
    .pop .sel{font-size:10px;color:var(--ov-sel);font-family:ui-monospace,Menlo,monospace;word-break:break-all;margin-bottom:6px}
    .pop .sel .cmp{color:var(--ov-cmp)}
    textarea{width:100%;height:64px;resize:none;background:var(--ov-bg2);color:var(--ov-text);border:1px solid var(--ov-border);
             border-radius:8px;padding:8px;font-size:13px;font-family:inherit}
    textarea:focus{outline:none;border-color:var(--ov-accent)}
    .pact{display:flex;gap:6px;margin-top:8px}
    .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483644;
           background:#1b3a1b;color:#bdf0bd;border:1px solid #2e572e;padding:8px 14px;border-radius:8px;font-size:12px;opacity:0;transition:opacity .2s}
    .toast.show{opacity:1}
    .hidden{display:none}
  </style>
  <div class="hl hidden"></div>
  <div class="band hidden"></div>
  <div class="tag hidden"></div>
  <div class="pins"></div>
  <div class="panel">
    <div class="phead">
      <span class="grip"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></span>
      <span class="status"></span>
      <button class="atog"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg><span class="atog-label">标注</span></button>
      <span class="count">0</span>
      <button class="setbtn"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
      <button class="hidebtn"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg></button>
    </div>
    <div class="body hidden">
      <div class="list"></div>
      <div class="foot"><button class="clear">Clear</button><button class="copy" disabled>Copy</button><button class="send" disabled>Send 0</button></div>
    </div>
    <div class="settings hidden"></div>
  </div>
  <div class="toast"></div>`;

  const $ = (s) => shadow.querySelector(s);
  const hlEl = $('.hl'), bandEl = $('.band'), tagEl = $('.tag'), panel = $('.panel'),
        pinsEl = $('.pins'), statusEl = $('.status'),
        pheadEl = $('.phead'), bodyEl = $('.body'), atogBtn = $('.atog'), hideBtn = $('.hidebtn'),
        setBtn = $('.setbtn'), settingsEl = $('.settings'), atogLabel = $('.atog-label'),
        listEl = $('.list'), countEl = $('.count'), sendBtn = $('.send'),
        clearBtn = $('.clear'), copyBtn = $('.copy'), toastEl = $('.toast');

  // ---- helpers -----------------------------------------------------------
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
      let sel = node.tagName.toLowerCase();
      const cls = [...node.classList].filter((c) => !c.startsWith('__')).slice(0, 2);
      if (cls.length) sel += '.' + cls.map((c) => CSS.escape(c)).join('.');
      const parent = node.parentNode;
      if (parent) {
        const sibs = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sibs.length > 1) sel += `:nth-of-type(${sibs.indexOf(node) + 1})`;
      }
      parts.unshift(sel);
      node = node.parentNode;
    }
    return parts.join(' > ');
  }

  // React fiber → { component, source } (best-effort, dev builds only).
  function getFiber(el) {
    const k = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    return k ? el[k] : null;
  }
  function fiberName(f) {
    const t = f && f.type;
    if (!t || typeof t === 'string') return null;
    return t.displayName || t.name || (t.render && (t.render.displayName || t.render.name)) || null;
  }
  function srcStr(s) {
    if (!s || !s.fileName) return null;
    return s.lineNumber ? `${s.fileName}:${s.lineNumber}` : s.fileName;
  }
  function reactInfo(el) {
    // In a production build component names are minified (e.g. <ie>) and there is
    // no _debugSource — so skip React detection in demo and just use the selector.
    if (DEMO) return null;
    let component = null, source = null;
    // data-attribute fallback (React 19 / react-dev-inspector / framework-agnostic)
    const dsEl = el.closest && el.closest('[data-source],[data-inspector-relative-path]');
    if (dsEl) {
      source = dsEl.getAttribute('data-source') ||
        (dsEl.getAttribute('data-inspector-relative-path')
          ? `${dsEl.getAttribute('data-inspector-relative-path')}:${dsEl.getAttribute('data-inspector-line') || ''}`.replace(/:$/, '')
          : null);
      component = dsEl.getAttribute('data-component') || dsEl.getAttribute('data-inspector-component') || null;
    }
    let f = getFiber(el);
    while (f && (!source || !component)) {
      if (!source && f._debugSource) source = srcStr(f._debugSource);
      if (!component) { const n = fiberName(f); if (n) component = n; }
      f = f.return;
    }
    return (component || source) ? { component, source } : null;
  }

  function pickStyles(el) {
    const cs = getComputedStyle(el);
    const out = {};
    for (const k of STYLE_KEYS) out[k] = cs[k];
    return out;
  }

  function isOurs(el) {
    return el === root || (el && el.getRootNode && el.getRootNode() === shadow);
  }

  function place(box, x, y, w, h) {
    box.style.left = x + 'px'; box.style.top = y + 'px';
    if (w != null) box.style.width = w + 'px';
    if (h != null) box.style.height = h + 'px';
  }

  function rectFrom(a, b) {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
  }

  function toast(msg, ok = true) {
    toastEl.textContent = msg;
    toastEl.style.background = ok ? '#1b3a1b' : '#3a1b1b';
    toastEl.style.color = ok ? '#bdf0bd' : '#f0bdbd';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  // Sample a grid of points to find the elements under a region.
  function elementsInRect(r) {
    const seen = new Set(), out = [];
    const cols = 4, rows = 3;
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
      const el = document.elementFromPoint(r.x + (r.w * i) / cols, r.y + (r.h * j) / rows);
      if (!el || isOurs(el)) continue;
      const sel = cssPath(el);
      if (seen.has(sel)) continue;
      seen.add(sel);
      const rx = reactInfo(el);
      out.push({ selector: sel, component: rx && rx.component, source: rx && rx.source });
      if (out.length >= 8) break;
    }
    return out;
  }

  // ---- hover highlight (element mode) ------------------------------------
  function onMove(e) {
    if (panelDrag || !on) return;
    // moving past the threshold while the button is down turns it into a region drag
    if (down && !drawing && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
      drawing = true; start = { x: down.x, y: down.y };
      hlEl.classList.add('hidden'); tagEl.classList.add('hidden');
      bandEl.classList.remove('hidden');
      document.body.style.userSelect = 'none';
    }
    if (drawing) { const r = rectFrom(start, { x: e.clientX, y: e.clientY }); place(bandEl, r.x, r.y, r.w, r.h); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOurs(el)) { hlEl.classList.add('hidden'); tagEl.classList.add('hidden'); hovered = null; return; }
    hovered = el;
    const r = el.getBoundingClientRect();
    hlEl.classList.remove('hidden');
    place(hlEl, r.left, r.top, r.width, r.height);
    const rx = reactInfo(el);
    const label = rx && rx.component
      ? '<' + rx.component + '>'
      : el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
        (el.classList.length ? '.' + [...el.classList].filter((c) => !c.startsWith('__'))[0] : '');
    tagEl.textContent = label;
    tagEl.classList.remove('hidden');
    place(tagEl, r.left, Math.max(0, r.top - 20));
  }

  // ---- region drawing ----------------------------------------------------
  function onDown(e) {
    if (!on || isOurs(e.target) || pop) return;
    down = { x: e.clientX, y: e.clientY };  // wait to see if it becomes a drag
  }
  function onUp(e) {
    if (drawing) {
      drawing = false;
      document.body.style.userSelect = '';
      down = null;
      suppressClick = true;                 // swallow the trailing click
      const r = rectFrom(start, { x: e.clientX, y: e.clientY });
      if (r.w < 6 || r.h < 6) { bandEl.classList.add('hidden'); return; }
      e.preventDefault(); e.stopPropagation();
      openRegionPopup(r, e);
      return;
    }
    down = null;                            // a plain click → onClick handles it
  }

  // ---- note popup (shared) ----------------------------------------------
  let pop = null;
  function openNotePopup(labelHtml, e, onCommit, initial) {
    closePopup();
    pop = document.createElement('div');
    pop.className = 'pop';
    pop.innerHTML = `<div class="sel"></div><textarea placeholder="${esc(t('ph'))}"></textarea>
      <div class="pact"><button class="clear" data-a="cancel">${esc(t('cancel'))}</button><button class="send" data-a="add" style="opacity:1">${initial ? esc(t('save')) : esc(t('add'))}</button></div>`;
    pop.querySelector('.sel').innerHTML = labelHtml;
    shadow.appendChild(pop);
    place(pop, Math.min(e.clientX, window.innerWidth - 296), Math.min(e.clientY, window.innerHeight - 170));
    const ta = pop.querySelector('textarea');
    if (initial) ta.value = initial;
    ta.focus();
    const commit = () => {
      const note = ta.value.trim();
      if (!note) { closePopup(); return; }
      onCommit(note);
      closePopup();
      renderList();
    };
    pop.addEventListener('click', (ev) => {
      const a = ev.target.dataset.a;
      if (a === 'add') commit();
      if (a === 'cancel') closePopup();
    });
    ta.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) commit();
      if (ev.key === 'Escape') { ev.stopPropagation(); closePopup(); }
    });
  }
  function closePopup() { if (pop) { pop.remove(); pop = null; } bandEl.classList.add('hidden'); }

  function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function openElementPopup(el, e) {
    const r = el.getBoundingClientRect();
    const selector = cssPath(el);
    const rx = reactInfo(el);
    const label = (rx && rx.component ? `<span class="cmp">&lt;${esc(rx.component)}&gt;</span> ` : '') +
      esc(rx && rx.source ? rx.source : selector);
    openNotePopup(label, e, (note) => {
      const item = {
        id: `${Date.now()}-${pending.length}`, ts: Date.now(), url: location.href, note,
        kind: 'element', selector,
        component: rx && rx.component || null, source: rx && rx.source || null,
        rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        pin: { px: r.left + window.scrollX, py: r.top + window.scrollY },
        html: el.outerHTML.slice(0, 4000), styles: pickStyles(el), _el: el,
      };
      pending.push(item);
      maybeShot(item, { left: r.left, top: r.top, width: r.width, height: r.height });
    });
  }

  function openRegionPopup(r, e) {
    const els = elementsInRect(r);
    const comp = els.find((x) => x.component);
    const label = esc(t('region')(Math.round(r.w), Math.round(r.h), els.length)) +
      (comp ? ` <span class="cmp">&lt;${esc(comp.component)}&gt;</span>` : '');
    openNotePopup(label, e, (note) => {
      const item = {
        id: `${Date.now()}-${pending.length}`, ts: Date.now(), url: location.href, note,
        kind: 'region', selector: null, elements: els,
        component: comp ? comp.component : null, source: comp ? comp.source : null,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) },
        pin: { px: r.x + window.scrollX, py: r.y + window.scrollY },
        _el: null,
      };
      pending.push(item);
      maybeShot(item, { left: r.x, top: r.y, width: r.w, height: r.h });
    });
  }

  async function maybeShot(item, r) {
    if (typeof window.__vibepinCapture !== 'function') return;
    try {
      item.screenshot = await window.__vibepinCapture({
        x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height),
      });
      renderList();
    } catch { /* optional */ }
  }

  function onClick(e) {
    if (panelDrag || !on) return;
    if (suppressClick) { suppressClick = false; return; }  // this click ended a drag
    if (isOurs(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const el = hovered || document.elementFromPoint(e.clientX, e.clientY);
    if (el && !isOurs(el)) openElementPopup(el, e);
  }

  // keep the floating panel's chrome in sync (active state + collapse when idle)
  function updatePanel() {
    atogBtn.classList.toggle('on', on);
    atogLabel.textContent = on ? t('annotating') : t('annotate');
    countEl.textContent = pending.length ? t('count')(pending.length) : '';
    setBtn.classList.toggle('on', settingsOpen);
    settingsEl.classList.toggle('hidden', !settingsOpen);
    bodyEl.classList.toggle('hidden', settingsOpen || !(on || pending.length));
    // compact pill when idle; full-width when the body/settings is open
    panel.classList.toggle('open', !!(settingsOpen || on || pending.length));
  }

  // ---- pending list ------------------------------------------------------
  function renderList() {
    countEl.textContent = pending.length;
    sendBtn.textContent = `Send ${pending.length}`;
    sendBtn.disabled = pending.length === 0;
    copyBtn.textContent = t('copy');
    copyBtn.disabled = pending.length === 0;
    updatePanel();
    if (!pending.length) { listEl.innerHTML = `<div class="empty">${esc(t('empty'))}</div>`; repositionPins(); return; }
    listEl.innerHTML = '';
    pending.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.cursor = 'pointer';
      row.title = t('tEdit');
      let head;
      if (p.component) head = `<span class="cmp">&lt;${esc(p.component)}&gt;</span>`;
      else if (p.kind === 'region') head = `▦ region ${p.rect.w}×${p.rect.h}`;
      else head = esc(p.selector || '');
      const src = p.source ? ' · ' + esc(p.source.split('/').pop()) : '';
      row.innerHTML = `<span class="pinno">${i + 1}</span><div style="flex:1"><div class="sel">${head}${src}${p.screenshot ? ' 📷' : ''}</div><div class="nt"></div></div><span class="x" title="${esc(t('tRemove'))}">✕</span>`;
      row.querySelector('.nt').textContent = p.note;
      row.querySelector('.x').addEventListener('click', (ev) => { ev.stopPropagation(); pending.splice(i, 1); renderList(); });
      row.addEventListener('click', (ev) => { if (ev.target.classList.contains('x')) return; editAnnotation(i, ev); });
      listEl.appendChild(row);
    });
    repositionPins();
  }

  // ---- on-page numbered pins + inline edit --------------------------------
  function repositionPins() {
    pinsEl.innerHTML = '';
    pending.forEach((p, i) => {
      if (!p.pin) return;
      const d = document.createElement('div');
      d.className = 'pin';
      d.textContent = i + 1;
      d.title = p.note || t('noNote');
      d.style.left = (p.pin.px - window.scrollX) + 'px';
      d.style.top = (p.pin.py - window.scrollY) + 'px';
      d.addEventListener('click', (ev) => { ev.stopPropagation(); editAnnotation(i, ev); });
      pinsEl.appendChild(d);
    });
  }
  function editAnnotation(i, e) {
    const p = pending[i];
    if (!p) return;
    const head = p.component ? `<span class="cmp">&lt;${esc(p.component)}&gt;</span> ` : '';
    const label = head + esc(p.source || p.selector || (p.kind === 'region' ? `region ${p.rect.w}×${p.rect.h}` : ''));
    openNotePopup(label, e, (note) => { p.note = note; renderList(); }, p.note);
  }

  async function send() {
    if (!pending.length) return;
    if (DEMO) { pending.length = 0; renderList(); toast(t('demoSent')); return; }
    const payload = pending.map(({ _el, ...rest }) => rest);
    try {
      const res = await fetch(ENDPOINT + '/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.status);
      pending.length = 0;
      renderList();
      toast(t('sent')(j.received));
    } catch (err) {
      toast(t('sendFail') + err.message, false);
    }
  }

  // ---- copy to clipboard (no daemon / agent needed — paste anywhere) -----
  function clipboardText() {
    const lines = [t('copyIntro'), ''];
    pending.forEach((p, i) => {
      let head;
      if (p.component) head = `<${p.component}>` + (p.source ? ` — ${p.source}` : '');
      else if (p.kind === 'region') head = `region ${p.rect.w}×${p.rect.h}` + (p.source ? ` — ${p.source}` : '');
      else head = p.selector || '(element)';
      lines.push(`${i + 1}. ${head}`);
      if (p.note) lines.push(`   ${p.note}`);
      if (p.kind === 'region' && p.elements && p.elements.length) {
        let skipped = false;   // drop the one component already shown as the head
        const els = p.elements
          .filter((e) => {
            if (!skipped && p.component && e.component === p.component) { skipped = true; return false; }
            return true;
          })
          .map((e) => e.component ? `<${e.component}>` : e.selector)
          .filter(Boolean).slice(0, 8);
        if (els.length) lines.push(`   elements: ${els.join(', ')}`);
      }
      lines.push('');
    });
    lines.push(`page: ${location.href}`);
    return lines.join('\n');
  }

  async function copyPending() {
    if (!pending.length) return;
    const text = clipboardText();
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard API');
      await navigator.clipboard.writeText(text);
      toast(t('copied')(pending.length));
    } catch {
      // fallback for insecure contexts / older Electron webviews
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        toast(ok ? t('copied')(pending.length) : t('copyFail'), ok);
      } catch { toast(t('copyFail'), false); }
    }
  }

  sendBtn.addEventListener('click', send);
  copyBtn.addEventListener('click', copyPending);
  clearBtn.addEventListener('click', () => { pending.length = 0; renderList(); });

  // ---- toggle (capture mode; the panel itself stays put) -----------------
  function toggle(force) {
    on = force == null ? !on : force;
    document.body.style.cursor = on ? 'crosshair' : '';
    panel.classList.remove('hidden');          // a toggle always reveals the panel
    if (!on) {
      down = null; drawing = false; document.body.style.userSelect = '';
      hlEl.classList.add('hidden'); tagEl.classList.add('hidden'); bandEl.classList.add('hidden'); closePopup();
    }
    renderList();
    toast(on ? t('modeOn') : t('modeOff'));
  }

  atogBtn.addEventListener('click', () => toggle());
  hideBtn.addEventListener('click', () => { if (on) toggle(false); panel.classList.add('hidden'); });
  setBtn.addEventListener('click', () => { settingsOpen = !settingsOpen; updatePanel(); });

  // ---- settings (language + shortcuts) -----------------------------------
  function renderSettings() {
    const g = t('g');
    settingsEl.innerHTML =
      `<div class="setgt">${esc(t('shortcuts'))}</div>` +
      `<div class="guide">` +
      g.map(([k, d]) => `<kbd class="gkey">${esc(k)}</kbd><span class="gdesc">${esc(d)}</span>`).join('') +
      `</div>` +
      `<div class="setdiv"></div>` +
      `<div class="setrow"><span class="langlabel">${esc(t('theme'))}</span>` +
      `<span class="seg2">` +
      `<button data-tm="dark" class="${theme === 'dark' ? 'on' : ''}">${esc(t('dark'))}</button>` +
      `<button data-tm="light" class="${theme === 'light' ? 'on' : ''}">${esc(t('light'))}</button>` +
      `</span></div>` +
      `<div class="setrow"><span class="langlabel">${esc(t('lang'))}</span>` +
      `<span class="seg2">` +
      `<button data-l="zh" class="${lang === 'zh' ? 'on' : ''}">中文</button>` +
      `<button data-l="en" class="${lang === 'en' ? 'on' : ''}">English</button>` +
      `</span></div>`;
    settingsEl.querySelectorAll('[data-l]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.l)));
    settingsEl.querySelectorAll('[data-tm]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.tm)));
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem('__vibepin_lang', l); } catch { /* ignore */ }
    applyI18n();
  }
  function setTheme(tm) {
    theme = tm;
    root.setAttribute('data-theme', tm);
    try { localStorage.setItem('__vibepin_theme', tm); } catch { /* ignore */ }
    renderSettings();
  }
  function applyI18n() {
    pheadEl.querySelector('.grip').title = t('tDrag');
    statusEl.title = t('tStatus');
    atogBtn.title = t('tAnno');
    setBtn.title = t('tSettings');
    hideBtn.title = t('tHide');
    renderSettings();
    renderList();   // rows + empty + updatePanel + pins
    checkHealth();  // refresh the status tooltip in the new language
  }

  // ---- drag the panel to reposition (persisted) --------------------------
  const POS_KEY = '__vibepin_pos';
  function clampIntoView() {
    if (panel.style.left === '' && panel.style.top === '') return; // still default right/bottom
    const w = panel.offsetWidth || 300, h = panel.offsetHeight || 40;
    const left = Math.max(4, Math.min(parseFloat(panel.style.left) || 0, window.innerWidth - w - 4));
    const top = Math.max(4, Math.min(parseFloat(panel.style.top) || 0, window.innerHeight - h - 4));
    panel.style.left = left + 'px'; panel.style.top = top + 'px';
  }
  function loadPos() {
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (p && Number.isFinite(p.left) && Number.isFinite(p.top)) {
        panel.style.left = p.left + 'px'; panel.style.top = p.top + 'px';
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        clampIntoView();                 // a stale/off-screen saved pos gets pulled back in
      }
    } catch { /* ignore */ }
  }
  // if the window shrinks below the panel's position, keep it reachable
  window.addEventListener('resize', clampIntoView);
  // pins are page-anchored — keep them under their elements while scrolling/resizing
  window.addEventListener('scroll', repositionPins, true);
  window.addEventListener('resize', repositionPins);

  // ---- daemon connection indicator ---------------------------------------
  async function checkHealth() {
    try {
      const r = await fetch(ENDPOINT + '/health', { cache: 'no-store' });
      statusEl.classList.toggle('ok', r.ok);
      statusEl.title = r.ok ? t('sOk') : t('sNoResp');
    } catch {
      statusEl.classList.remove('ok');
      statusEl.title = t('sNo');
    }
  }
  if (DEMO) { statusEl.style.display = 'none'; }
  else { checkHealth(); setInterval(checkHealth, 10000); }
  pheadEl.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;    // buttons aren't drag handles
    const r = panel.getBoundingClientRect();
    panelDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', (e) => {
    if (!panelDrag) return;
    const x = Math.max(4, Math.min(e.clientX - panelDrag.dx, window.innerWidth - panel.offsetWidth - 4));
    const y = Math.max(4, Math.min(e.clientY - panelDrag.dy, window.innerHeight - panel.offsetHeight - 4));
    panel.style.left = x + 'px'; panel.style.top = y + 'px';
  }, true);
  document.addEventListener('mouseup', () => {
    if (!panelDrag) return;
    panelDrag = null;
    try { localStorage.setItem(POS_KEY, JSON.stringify({ left: panel.offsetLeft, top: panel.offsetTop })); } catch { /* ignore */ }
  }, true);

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('mousedown', onDown, true);
  document.addEventListener('mouseup', onUp, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', (e) => {
    // e.code (physical key) not e.key — on macOS Option+A emits 'å', breaking e.key.
    if (e.altKey && e.code === 'KeyA') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape' && on && !pop && !drawing) toggle(false);
  }, true);

  loadPos();
  window.__vibepin = { toggle, pending, endpoint: ENDPOINT, setLang };
  applyI18n();   // sets all text/titles for the current language + first render
  console.log('[vibepin] overlay ready — floating panel; ⌥A toggle · click=element, drag=region. endpoint:', ENDPOINT);
})();
