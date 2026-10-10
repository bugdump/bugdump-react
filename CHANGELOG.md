# Changelog

## 0.0.45

Needs `@bugdump/sdk` 0.0.45. Released together with it, at the same version, as every release of the two packages will be.

### Added

- **`BugdumpProvider`** starts the widget after the first render and destroys it on unmount. It adopts an instance your app created with `Bugdump.init()` and never destroys that one. Only a change of `apiKey`, `endpoint` or `locale` restarts the widget, and `enabled` defers it, for example until the user logs in.
- **`useBugdump()`** returns the running instance, or `null` on the server, before the widget starts and while it is disabled.
- **`BugdumpErrorBoundary`** shows a fallback when a child throws and sends the error with React's component stack. An error from the first render is held until the widget has started.
