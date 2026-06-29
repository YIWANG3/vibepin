export default function Hero() {
  return (
    <header className="hero">
      <span className="badge">vibepin · Next.js</span>
      <h1>
        Drop a pin on any UI.<br />
        <span className="accent">Your AI agent edits the source.</span>
      </h1>
      <p className="lede">
        Press <kbd>⌥A</kbd>, click an element (e.g. this heading), write a note, hit Send.
        Annotations carry the React component name so your agent edits the right file.
      </p>
    </header>
  );
}
