'use client';
// Client component so the tree has React fibers — that's what lets the overlay
// read the component name for each element you annotate.
import Hero from '../components/Hero.jsx';
import Card from '../components/Card.jsx';

const items = [
  { title: 'Dashboard', sub: 'Overview & metrics', tone: 'a' },
  { title: 'Projects', sub: '12 active', tone: 'b' },
  { title: 'Team', sub: '8 members', tone: 'c' },
  { title: 'Analytics', sub: 'Last 30 days', tone: 'd' },
  { title: 'Settings', sub: 'Workspace config', tone: 'e' },
  { title: 'Billing', sub: 'Pro plan', tone: 'f' },
];

export default function Page() {
  return (
    <main className="wrap">
      <Hero />
      <div className="grid">
        {items.map((it) => (
          <Card key={it.title} title={it.title} sub={it.sub} tone={it.tone} />
        ))}
      </div>
    </main>
  );
}
