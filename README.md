# @bugdump/react

Official React bindings for [Bugdump](https://bugdump.com): a provider that starts the bug reporting widget once and cleans it up, a hook that returns the SDK instance, and an error boundary that sends the errors React catches to your project's Errors page.

It draws nothing itself. The widget is [`@bugdump/sdk`](https://www.npmjs.com/package/@bugdump/sdk), which this package wraps; see its README for every option.

## Installation

```bash
npm install @bugdump/react @bugdump/sdk
# or
pnpm add @bugdump/react @bugdump/sdk
# or
yarn add @bugdump/react @bugdump/sdk
```

Both packages are released together, at the same version. Upgrade them together too.

Works with React 18 and 19.

**Remove the Bugdump `<script>` tag** if your site has one. The script tag loads its own copy of the SDK, which this package cannot see, and the two would put two widgets on the page.

## Provider

Wrap your app once, as high as you can:

```tsx
import { BugdumpProvider } from '@bugdump/react';

export function Root() {
  return (
    <BugdumpProvider config={{ apiKey: 'your-api-key' }}>
      <App />
    </BugdumpProvider>
  );
}
```

`config` takes every option `Bugdump.init()` does. The widget starts after the provider's first render, never during it, so a server render never starts it.

The widget restarts only when `apiKey`, `endpoint` or `locale` changes. Every other option is read once, when the widget starts, so passing a new `config` object on each render is fine. A restart closes an open report panel.

### Starting it later

`enabled` defers the widget, for example until the user logs in or consents:

```tsx
<BugdumpProvider config={{ apiKey: 'your-api-key' }} enabled={user !== null}>
  <App />
</BugdumpProvider>
```

Nothing starts while `enabled` is `false`, and the hook returns `null`. Turning it on starts the widget without remounting your app; turning it off removes the widget again.

### When capture starts

The widget records console output and network requests from the moment it starts, which is right after the provider's first render, not when the page loads. If you need what happens before that, call `Bugdump.init()` from `@bugdump/sdk` yourself before rendering. The provider then uses that instance and never destroys it; its own `config` is ignored.

### One provider

Use one provider per app, and don't call `destroy()` or `init()` yourself underneath it. There is only one widget per page: a provider nested inside another starts the widget itself and destroys it when it unmounts, while the outer one still hands it out, and an instance you replace yourself leaves the hook holding the old one. To change the language, change the provider's `locale`.

## useBugdump

`useBugdump()` returns the running `Bugdump` instance, or `null` on the server, before the widget has started and while it is disabled. It throws outside a `BugdumpProvider`.

```tsx
import { useBugdump } from '@bugdump/react';

function ReportButton() {
  const bugdump = useBugdump();
  return <button onClick={() => bugdump?.open()}>Report a bug</button>;
}
```

Identify the signed-in user with an effect:

```tsx
function IdentifyUser({ user }: { user: User | null }) {
  const bugdump = useBugdump();

  useEffect(() => {
    if (!bugdump) return;
    if (user) bugdump.identify({ id: user.id, name: user.name, email: user.email });
    else bugdump.reset();
  }, [bugdump, user]);

  return null;
}
```

Keep `bugdump` in the dependencies of every effect that calls `identify`, `setContext`, `setTheme` or `identifyTask`. A restart creates a fresh instance without them, and the dependency is what sets them again.

## Error boundary

`BugdumpErrorBoundary` shows a fallback when a component below it throws, and sends the error to Bugdump with React's component stack:

```tsx
import { BugdumpErrorBoundary, BugdumpProvider } from '@bugdump/react';

<BugdumpProvider config={{ apiKey: 'your-api-key' }}>
  <BugdumpErrorBoundary
    fallback={(error, reset) => <button onClick={reset}>Something went wrong. Try again</button>}
    onError={(error, info) => console.error(error, info.componentStack)}
  >
    <App />
  </BugdumpErrorBoundary>
</BugdumpProvider>;
```

- Put it **inside** the provider. An error in the very first render happens before the widget has started; the boundary hands it to the provider, which sends it once the widget is running. A boundary above the provider would replace the provider before it starts.
- `fallback` is an element, or a function that gets the error and a `reset` that renders the children again.
- `onError` is optional and runs for every caught error, after the boundary has handed it on.
- While the provider's `enabled` is `false`, caught errors are not sent, and not kept for later either.
- In a layout that stays mounted across navigations, give the boundary `key={pathname}`, so its fallback does not outlive the page that failed.
- Without a provider above it, the boundary sends to the instance `Bugdump.init()` created, if there is one.

Uncaught errors and unhandled promise rejections are captured by the SDK itself. An error a React boundary catches never reaches it in production, which is what this boundary is for.

### Errors another boundary catches

An error stops at the nearest boundary. A router's error component, or Next.js's `error.tsx`, catches it before `BugdumpErrorBoundary` can. Send it from there:

```tsx
'use client';

import { useBugdump } from '@bugdump/react';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const bugdump = useBugdump();

  useEffect(() => {
    bugdump?.captureException(error);
  }, [bugdump, error]);

  return <button onClick={reset}>Try again</button>;
}
```

### React 18 in development

In development, React 18 also re-throws a caught error to `window`. Once the widget is running, the SDK sees that copy first and sends each error only once per tab session, so the event arrives marked as an uncaught error, without the component stack. React 19, and React 18 in production, report through the boundary only, with the stack.

## Next.js App Router

The provider and the boundary are client components, so they go straight into `app/layout.tsx`:

```tsx
import { BugdumpErrorBoundary, BugdumpProvider } from '@bugdump/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BugdumpProvider config={{ apiKey: process.env.NEXT_PUBLIC_BUGDUMP_KEY! }}>
          <BugdumpErrorBoundary fallback={<p>Something went wrong.</p>}>{children}</BugdumpErrorBoundary>
        </BugdumpProvider>
      </body>
    </html>
  );
}
```

A Server Component can pass only serializable props. A `config` with functions or RegExps (`consoleFilter`, `networkFilter`, `ignoreErrors`, `beforeSend`), or a boundary with a function `fallback` or `onError`, goes in a file of your own that starts with `'use client'`, and the layout renders that.

`app/global-error.tsx` replaces the root layout. By the time it renders, the provider has unmounted and destroyed its widget, so start one there to send the error. It is a fresh widget, so the event has no console or network history from before the crash.

```tsx
'use client';

import { Bugdump } from '@bugdump/sdk';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    const bugdump = Bugdump.getInstance() ?? Bugdump.init({ apiKey: process.env.NEXT_PUBLIC_BUGDUMP_KEY! });
    bugdump.captureException(error);
  }, [error]);

  return (
    <html>
      <body>Something went wrong.</body>
    </html>
  );
}
```

## License

MIT
