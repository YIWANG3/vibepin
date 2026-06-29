import React from 'react';

const features = [
  { ic: '🌐', title: 'Web + Electron', body: 'One overlay for any Chromium page — a Vite/Next/whatever dev server, or your Electron renderer.' },
  { ic: '⚛️', title: 'React-aware', body: 'Annotations carry the component name and source file:line, so the agent edits the right file — not a guess.' },
  { ic: '🔌', title: 'Two pickups', body: 'A zero-dependency file watcher, or an MCP watch_annotations tool. Same inbox, your choice.' },
  { ic: '🖱️', title: 'Pin or region', body: 'Click a single element, or drag a box over a whole area that feels off. Both become structured notes.' },
  { ic: '📌', title: 'Numbered pins', body: 'Every annotation drops a numbered pin on the page. Click it to edit. Batch them, then Send.' },
  { ic: '🔒', title: 'Local & private', body: 'No cloud, no account, no API key. The daemon runs on 127.0.0.1 and writes to a file in your repo.' },
];

export default function Features() {
  return (
    <section className="block" id="features">
      <div className="container">
        <div className="eyebrow">Features</div>
        <h2 className="h2">Built for a tight feedback loop</h2>
        <div className="features">
          {features.map((f) => (
            <div className="feature" key={f.title}>
              <div className="ic">{f.ic}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
