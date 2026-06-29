// The web example is the same vibepin landing page, but plain HTML/JS (no React).
// Nothing here knows about vibepin — the overlay is injected by the Vite plugin
// in dev. Annotations on this page carry a CSS selector (no React component).
const steps = [
  ['1', 'Pin it', 'Press ⌥A, then click an element or drag a box over a region of your running app.'],
  ['2', 'Note it', 'Type what should change in plain words — “tighten this padding”, “make this a ghost button”.'],
  ['3', 'Ship it', 'Your coding agent drains the queue and edits the right file in your source.'],
];

document.querySelector('#app').innerHTML = `
  <nav class="nav"><div class="container nav-in">
    <a class="brand"><span class="dot"></span> vibepin</a>
    <div class="nav-links"><a href="#how">How it works</a><a href="https://github.com/YIWANG3/vibepin">GitHub</a></div>
    <button class="themebtn" id="themebtn" aria-label="Toggle theme"></button>
    <a class="btn primary" href="https://github.com/YIWANG3/vibepin">Get started</a>
  </div></nav>

  <header class="hero container">
    <span class="badge">$ npm i -D vibepin</span>
    <h1>Drop a pin on any UI.<br><span class="accent">Your AI agent edits the source.</span></h1>
    <p class="lede">In-browser visual annotation that hands your note straight to your coding agent —
      no screenshots, no copy-paste, no describing <em>which</em> element.</p>
    <div class="cta">
      <a class="btn primary" href="https://github.com/YIWANG3/vibepin">Get started →</a>
      <a class="btn ghost" href="https://github.com/YIWANG3/vibepin">★ Star on GitHub</a>
    </div>
    <div class="tryhint">👆 This page is a plain HTML app. Press <kbd>⌥A</kbd>, click this headline,
      type <b>“make it bigger”</b>, hit Send — vibepin pins the element (with its CSS selector)
      and your agent edits <code>src/main.js</code>.</div>
  </header>

  <section class="block" id="how"><div class="container">
    <div class="eyebrow">How it works</div>
    <h2 class="h2">From “change this” to a real edit</h2>
    <p class="sub">No selectors to copy, no context to paste. The pin carries what your agent needs.</p>
    <div class="steps">
      ${steps.map(([n, t, b]) => `
        <div class="step"><div class="n">${n}</div><h3>${t}</h3><p>${b}</p></div>`).join('')}
    </div>
  </div></section>

  <footer class="footer"><div class="container footer-in">
    <a class="brand"><span class="dot"></span> vibepin</a>
    <span class="sp">MIT</span><a href="https://github.com/YIWANG3/vibepin">GitHub</a>
  </div></footer>`;

// theme toggle (dark/light), persisted
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const btn = document.getElementById('themebtn');
function paint() {
  const t = document.documentElement.dataset.theme || 'dark';
  btn.innerHTML = t === 'dark' ? SUN : MOON;
  btn.title = 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' mode';
}
btn.addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('vibepin_site_theme', t); } catch {}
  paint();
});
paint();
