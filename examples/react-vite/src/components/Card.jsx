import React from 'react';

export default function Card({ title, sub, tone }) {
  return (
    <div className={`card tone-${tone}`}>
      <div className="thumb" />
      <div className="meta">
        <div className="title">{title}</div>
        <div className="sub">{sub}</div>
      </div>
    </div>
  );
}
