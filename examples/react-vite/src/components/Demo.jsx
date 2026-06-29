import React from 'react';

// public/ assets resolve under the build base (/ in dev, /vibepin/ on Pages).
const base = import.meta.env.BASE_URL;

export default function Demo() {
  return (
    <section className="demo container">
      <div className="demoframe">
        <video
          src={`${base}demo.mp4`}
          poster={`${base}demo.png`}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </section>
  );
}
