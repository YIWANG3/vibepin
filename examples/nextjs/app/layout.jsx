import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'vibepin — Next.js example',
  description: 'In-browser UI annotation for AI coding agents, in a Next.js app.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* dev only — the vibepin overlay (served by the daemon on :7331) */}
        {process.env.NODE_ENV === 'development' && (
          <Script src="http://127.0.0.1:7331/annotate.js" strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
