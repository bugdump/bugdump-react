# Changelog

## 0.0.51

Needs `@bugdump/sdk` 0.0.51. Released together with it; the code of this package did not change.

### Fixed

- **Drawing on a screenshot no longer adds actions to the report.** Every click in the screenshot editor (its tools, colors, canvas, Cancel and Done) was recorded as a `Clicked <div>` action between the reporter's real steps.

## 0.0.50

Needs `@bugdump/sdk` 0.0.50. Released together with it; the code of this package did not change.

### Changed

- **The description is now optional.** The widget sends a report with no text and no attachments, and `description` is optional in `submit()`.
- **The default placeholder now asks for feedback.** `descriptionPlaceholder` reads "Share your feedback or report a problem" instead of "What's on your mind?", translated in every built-in language. A value you pass in `translations` still wins.

### Deprecated

- **`emptyDescriptionMessage` has no effect.** The widget no longer shows this message. The key still compiles, and you can remove it from your `translations`.

## 0.0.49

Needs `@bugdump/sdk` 0.0.49. Released together with it; the code of this package did not change.

### Fixed

- **Screen recordings now carry the microphone when the shared screen has no sound of its own.** In Firefox, in Safari, and in Chrome when a window or the whole screen was shared or "Share tab audio" was left unchecked, the mic button lit up but the recording was silent.

### Added

- **A screen recording says whether the microphone was on.** Its attachment metadata carries `micUsed`: `true` when the reporter's microphone was on at any moment of the recording.

## 0.0.48

Needs `@bugdump/sdk` 0.0.48. Released together with it; the code of this package did not change.

### Fixed

- **iOS no longer zooms the page when you tap into the report form on an iPad or a phone held sideways.** The description and the text fields now use 16px type on every screen, not only up to 440px wide.

## 0.0.47

Needs `@bugdump/sdk` 0.0.47. Released together with it; the code of this package did not change.

### Changed

- **On screens up to 440px wide the widget shows only the round button.** The `bubbleText` teaser next to it is hidden there, because it covered the host page's content.
- **`--bugdump-offset-bottom`** lifts the button above a fixed bar at the bottom of the page, such as a mobile tab bar. Set it on your page, for example `:root { --bugdump-offset-bottom: 64px; }`; the widget adds it to its 20px margin.

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
