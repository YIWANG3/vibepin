import React from 'react';

export default function Hero() {
  return (
    <header className="hero container">
      <span className="badge">$ npm i -D vibepin</span>
      <h1>
        Drop a pin on any UI.<br />
        <span className="accent">Your AI agent edits the source.</span>
      </h1>
      <p className="lede">
        In-browser visual annotation that hands your note straight to your coding agent —
        no screenshots, no copy-paste, no describing <em>which</em> element. Web + Electron.
      </p>
      <div className="cta">
        <a className="btn primary" href="https://github.com/YIWANG3/vibepin">Get started →</a>
        <a className="btn ghost" href="https://github.com/YIWANG3/vibepin">★ Star on GitHub</a>
      </div>

      <div className="tryhint">
        👆 This page is a live React app. Press <kbd>⌥A</kbd>, click this headline, type
        <b> “make it bigger” </b>, hit Send — vibepin pins the exact component and your agent
        edits <code>Hero.jsx</code>.
      </div>

      <div className="codecard">
        <div className="bar"><i /><i /><i /><span>vite.config.js</span></div>
        <pre><div className="c">{'// add one plugin — that’s the whole setup'}</div><div><span className="k">import</span> vibepin <span className="k">from</span> <span className="s">'vibepin/vite'</span></div><div>{' '}</div><div><span className="k">export default</span>{' { plugins: ['}<span className="s">vibepin</span>{'()] }'}</div></pre>
      </div>
    </header>
  );
}
