import React from 'react';
import ThemeToggle from './ThemeToggle.jsx';

export default function Nav() {
  return (
    <nav className="nav">
      <div className="container nav-in">
        <a className="brand"><span className="dot" /> vibepin</a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="https://github.com/YIWANG3/vibepin">GitHub</a>
        </div>
        <ThemeToggle />
        <a className="btn primary" href="https://github.com/YIWANG3/vibepin">Get started</a>
      </div>
    </nav>
  );
}
