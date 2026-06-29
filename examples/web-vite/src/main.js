// A tiny, realistic-looking UI so annotations feel real. Nothing here knows
// about vibepin — the overlay is injected by the Vite plugin in dev.
const items = [
  { title: 'Onboarding flow', sub: 'Updated 2 days ago' },
  { title: 'Billing settings', sub: '12 plans' },
  { title: 'Team directory', sub: '8 members' },
  { title: 'Release notes', sub: 'v2.4.0' },
  { title: 'Analytics', sub: 'Last 30 days' },
  { title: 'API keys', sub: '3 active' },
];

document.querySelector('#app').innerHTML = `
  <div class="wrap">
    <header>
      <h1>Acme · Web</h1>
      <span class="hint">Press <b>Alt+A</b>, click anything, type a note, Send.</span>
    </header>
    <div class="toolbar">
      <button class="btn">New</button>
      <button class="btn secondary">Filter</button>
      <button class="btn secondary">Export</button>
    </div>
    <div class="grid">
      ${items.map(p => `
        <div class="card">
          <div class="thumb"></div>
          <div class="meta">
            <div class="title">${p.title}</div>
            <div class="sub">${p.sub}</div>
          </div>
        </div>`).join('')}
    </div>
    <footer>vibepin web example · the overlay is injected only in dev</footer>
  </div>`;
