# Next.js integration

Next.js is React, so component + `file:line` detection works in dev (Next ships
React's dev JSX transform). It uses webpack/turbopack rather than Vite, so there's
no one-line plugin — instead it's **two small dev-only steps**: start the daemon,
and inject the overlay script.

## 1. Auto-start the daemon (wrap your config)

Use an ESM config (`next.config.mjs`):

```js
import withVibepin from 'vibepin/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...your config
};

export default withVibepin(nextConfig);
```

`withVibepin` spawns `vibepin daemon` (port 7331) in dev and is a no-op in
production. *(Prefer not to wrap the config? Just run `npx vibepin daemon` in a
separate terminal, or add it to your dev script.)*

## 2. Inject the overlay (dev only)

### App Router — `app/layout.tsx`

```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <Script src="http://127.0.0.1:7331/annotate.js" strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
```

### Pages Router — `pages/_app.tsx`

```tsx
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      {process.env.NODE_ENV === 'development' && (
        <Script src="http://127.0.0.1:7331/annotate.js" strategy="afterInteractive" />
      )}
    </>
  );
}
```

## 3. Run it

```bash
npm run dev          # daemon auto-starts via withVibepin; overlay injects in dev
```

Open the app, press **⌥A**, annotate. Then in a Claude Code session at the project
root run **`/vpin`** (install once with `npx vibepin init`). Annotations carry the
component name + source line, so the agent edits the right file.

## Notes

- The overlay script and daemon only run in development; production builds are untouched.
- `.gitignore` → add `.vibepin/`.
- Turbopack (`next dev --turbo`) works the same — both inject the script and read the
  React fiber for component/source.
