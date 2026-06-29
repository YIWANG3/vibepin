import React from 'react';

const steps = [
  { n: '1', title: 'Pin it', body: 'Press ⌥A, then click an element or drag a box over a region of your running app.' },
  { n: '2', title: 'Note it', body: 'Type what should change in plain words — “tighten this padding”, “make this a ghost button”.' },
  { n: '3', title: 'Ship it', body: 'Your coding agent drains the queue and edits the right file. React? It gets the component + source line.' },
];

export default function Steps() {
  return (
    <section className="block" id="how">
      <div className="container">
        <div className="eyebrow">How it works</div>
        <h2 className="h2">From “change this” to a real edit</h2>
        <p className="sub">No selectors to copy, no context to paste. The pin carries everything your agent needs.</p>
        <div className="steps">
          {steps.map((s) => (
            <div className="step" key={s.n}>
              <div className="n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
