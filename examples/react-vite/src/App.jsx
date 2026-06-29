import React from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Demo from './components/Demo.jsx';
import Steps from './components/Steps.jsx';
import Features from './components/Features.jsx';
import Footer from './components/Footer.jsx';

// This landing page is itself the demo: it's a real React app, so press ⌥A and
// annotate any piece of it — vibepin hands the note (with the component + source
// line) to your coding agent, which edits these very files.
export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <Demo />
      <Steps />
      <Features />
      <Footer />
    </>
  );
}
