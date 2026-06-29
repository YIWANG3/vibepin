import React from 'react';

export default function Toolbar() {
  return (
    <div className="toolbar">
      <input type="text" placeholder="Search..." style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px' }} />
      <button className="btn">Import</button>
      <button className="btn secondary">Export</button>
      <button className="btn secondary">Filter</button>
    </div>
  );
}
