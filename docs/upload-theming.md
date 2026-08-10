# Upload Theming Guide

The upload form (composed of `UploadZone` and `UploadSkeleton`) supports light,
dark, and system theme preferences. This guide documents how the upload view
consumes theme tokens, which CSS class hooks are available for high-contrast
mode, and how to customise the upload appearance safely.

## How the theme is applied

The upload view relies on the same global theme mechanism as the rest of the
dashboard:

1. `components/ThemeToggle.jsx` stores the selected preference under the
   `liquifact-theme` localStorage key.
2. The pre-paint script in `app/layout.js` resolves the system preference
   against `prefers-color-scheme` and sets `data-theme="light"` or
   `data-theme="dark"` on `<html>`.
3. `app/globals.css` selects the matching token values and applies the global
   page background, foreground, and font.
4. The upload view's CSS class hooks (`.upload-dropzone`, `.upload-subtle-panel`,
   `.upload-muted-text`) are styled in `app/globals.css` under both
   `@media (forced-colors: active)` and `@media (prefers-contrast: more)`
   media queries to ensure legibility when the user enables high-contrast mode.

## Current upload tokens

The upload view does not introduce its own CSS custom properties. Instead, it
consumes the global dashboard tokens defined in `app/globals.css`:

| Token | Dark value | Light value | Purpose |
| --- | --- | --- | --- |
| `--color-bg` | `#020617` | `#f8fafc` | Page background |
| `--color-fg` | `#f1f5f9` | `#0f172a` | Primary text |
| `--color-muted` | `#94a3b8` | `#64748b` | Secondary text and labels |
| `--color-primary` | `#22d3ee` | `#0891b2` | Brand accent, active states, upload button |
| `--color-focus-ring` | `#22d3ee` | `#0891b2` | Keyboard focus indicator |

## Upload-specific CSS class hooks

The upload view uses three dedicated CSS class hooks that are consumed by the
high-contrast rules in `app/globals.css`:

| Class hook | Element | Purpose |
| --- | --- | --- |
| `.upload-dropzone` | The drag-and-drop area (`role="button"`) | Ensures the dashed border and background are visible under forced-colors |
| `.upload-subtle-panel` | The `FileConstraintNotice` requirements panel (`role="note"`) | Replaces low-opacity `bg-cyan-500/5` fill with a solid border under forced-colors |
| `.upload-muted-text` | Secondary text elements (file size, browse prompt, helper text) | Overrides `text-slate-500` / `text-slate-400` with a high-contrast color under `prefers-contrast: more` |

These hooks are defined in `app/globals.css` inside the following media queries:

```css
@media (forced-colors: active) {
  .upload-dropzone { … }
  .upload-subtle-panel { … }
}
@media (prefers-contrast: more) {
  .upload-muted-text { … }
}
```

## Fixed Tailwind palette usage

The upload view uses several fixed Tailwind palette utilities that do not
respond to theme tokens. New upload components should prefer semantic tokens
where practical.

| Element | Current class | Recommended token |
| --- | --- | --- |
| Dropzone idle border | `border-slate-700` | `border-[var(--color-border)]` |
| Dropzone active file | `border-emerald-500/40` | `border-[var(--color-primary)]` |
| Dropzone error | `border-red-500/50` | Kept as-is (error state) |
| Requirements panel | `border-cyan-500/20 bg-cyan-500/5` | `.upload-subtle-panel` hook |
| Upload button | `bg-cyan-500 text-slate-950` | `bg-[var(--color-primary)] text-[var(--color-bg)]` |
| Success button | `bg-emerald-600 text-white` | Kept as-is (success state) |
| Progress bar track | `bg-cyan-950/50` | `bg-[var(--color-muted)]` |
| Progress bar fill | `bg-cyan-400` | `bg-[var(--color-primary)]` |
| File name text | `text-emerald-400` | Kept as-is (success state) |
| Muted copy | `text-slate-500 text-slate-400` | `.upload-muted-text` hook |

## High-contrast mode support

The upload view is tested against forced-colors and prefers-contrast media
queries in `components/UploadZone.motion-contrast.test.jsx`. The test suite
asserts:

1. The `.upload-dropzone` class is present on the dropzone element.
2. The `.upload-subtle-panel` class is present on the requirements panel.
3. The `.upload-muted-text` class is present on secondary copy elements.
4. The `app/globals.css` file defines rules for each of these hooks under
   both `@media (forced-colors: active)` and `@media (prefers-contrast: more)`.

When adding a new visual element to the upload view, ensure it:

- Does not rely solely on low-opacity fills or colour-only distinctions that
  are invisible under forced-colors.
- Carries a `.upload-*` class hook when its appearance depends on low-opacity
  colour utilities.
- Has a focus-visible ring that is visible in both normal and high-contrast
  modes (use the `.focus-ring` utility).

## Reduced-motion support

The upload view also respects the user's reduced-motion preference:

- Spinner rotation is suppressed via `motion-reduce:animate-none`.
- All colour transitions use `motion-reduce:transition-none`.
- The `@media (prefers-reduced-motion: reduce)` rule in `app/globals.css`
  suppresses animation-duration and transition-duration globally.

See `components/UploadZone.motion-contrast.test.jsx` for the test coverage.

## Customising the upload

1. Update the high-contrast rules in `app/globals.css` under the
   `forced-colors` and `prefers-contrast` media queries.
2. Add or update `.upload-*` class hooks when adding new visual elements.
3. Verify focus-visible rings are visible in both normal and high-contrast
   modes.
4. Run the upload documentation test, the motion-contrast test, and the full
   repository checks.

## Verification

```bash
npm test -- docs/upload-theming.test.js --runInBand
npm test -- components/UploadZone.motion-contrast.test.jsx --runInBand
npm run lint
npm test
npm run build
```