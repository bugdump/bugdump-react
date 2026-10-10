# Changelog

## 0.0.46

Needs `@bugdump/sdk` 0.0.46. Released together with it; the code of neither package changed.

### Fixed

- **The README's `app/global-error.tsx` example** now starts a widget of its own. By the time that file renders, the provider has destroyed its widget, so the old example sent nothing. The README also says correctly when `onError` runs and what a nested provider does.

## 0.0.45

Needs `@bugdump/sdk` 0.0.45. Released together with it, at the same version, as every release of the two packages will be.

### Added

- **`BugdumpProvider`** starts the widget after the first render and destroys it on unmount. It adopts an instance your app created with `Bugdump.init()` and never destroys that one. Only a change of `apiKey`, `endpoint` or `locale` restarts the widget, and `enabled` defers it, for example until the user logs in.
- **`useBugdump()`** returns the running instance, or `null` on the server, before the widget starts and while it is disabled.
- **`BugdumpErrorBoundary`** shows a fallback when a child throws and sends the error with React's component stack. An error from the first render is held until the widget has started.
