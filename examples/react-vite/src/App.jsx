import React, { useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import Card from './components/Card.jsx';

const allItems = [
  { id: 1, title: 'Onboarding flow', sub: 'Updated 2 days ago', tone: 'a' },
  { id: 2, title: 'Billing settings', sub: '12 plans', tone: 'b' },
  { id: 3, title: 'Team directory', sub: '8 members', tone: 'c' },
  { id: 4, title: 'Release notes', sub: 'v2.4.0', tone: 'd' },
  { id: 5, title: 'Analytics', sub: 'Last 30 days', tone: 'e' },
  { id: 6, title: 'API keys', sub: '3 active', tone: 'f' },
  { id: 7, title: 'Webhooks', sub: '5 endpoints', tone: 'a' },
  { id: 8, title: 'Audit log', sub: '1.2k events', tone: 'b' },
  { id: 9, title: 'Integrations', sub: '9 connected', tone: 'c' },
  { id: 10, title: 'Notifications', sub: 'Email + Slack', tone: 'd' },
  { id: 11, title: 'Permissions', sub: '4 roles', tone: 'e' },
  { id: 12, title: 'Storage', sub: '42 GB used', tone: 'f' },
  { id: 13, title: 'Domains', sub: '2 verified', tone: 'a' },
  { id: 14, title: 'Backups', sub: 'Daily', tone: 'b' },
  { id: 15, title: 'Support', sub: 'Open tickets: 3', tone: 'c' },
];

export default function App() {
  const [visibleCount, setVisibleCount] = useState(9);
  const items = allItems.slice(0, visibleCount);
  const hasMore = visibleCount < allItems.length;

  return (
    <div className="wrap">
      <header className="header">
        <h1>Acme · React</h1>
        <span className="hint">⌥A toggle · click an element or drag a box, type a note, Send.</span>
      </header>
      <Toolbar />
      <div className="grid">
        {items.map((p) => (
          <Card key={p.id} title={p.title} sub={p.sub} tone={p.tone} />
        ))}
      </div>
      {hasMore && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button className="btn" onClick={() => setVisibleCount(visibleCount + 6)}>
            Load More
          </button>
        </div>
      )}
      <footer className="footer">annotations carry the React component name + source file:line</footer>
    </div>
  );
}
