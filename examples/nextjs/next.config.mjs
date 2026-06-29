import withVibepin from 'vibepin/next';

// withVibepin auto-starts the vibepin daemon in dev (no-op in production).
// The overlay <script> is injected in app/layout.jsx (dev only).
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withVibepin(nextConfig);
