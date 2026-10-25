# Settings component API

Concise reference for the settings UI surfaces in `app/settings/page.js` and `components/SettingsView.jsx`.

## Components

### `SettingsRoute`

Default export from `app/settings/page.js`. This is the Next.js route component for `/settings`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `loadSettings` | `Function` | No | `loadMockSettings` | Forwarded to `SettingsPage`; async loader used to fetch settings rows. Receives `{ signal }` with an `AbortSignal`. |

### `SettingsPage`

Named export from `app/settings/page.js`. Renders the full settings page, including navigation, filters, loading state, retryable error state, list rows, live-region announcements, and load-more pagination.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `loadSettings` | `Function` | No | `loadMockSettings` | Async loader. Should resolve to an array of settings rows. Rejections render the retryable error state. |

Settings rows are expected to include `id`, `label`, `description`, `category`, `type`, and `value`.

### `SettingsView`

Default export from `components/SettingsView.jsx`. Wraps `SettingsContent` in `SettingsErrorBoundary`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `children` | `ReactNode` | No | `undefined` | Optional content rendered above the built-in email and notification controls. |
| `loadData` | `Function` | No | `undefined` | Optional async loader for the compact settings form. Should resolve to `{ email, notifications }`. |
| `...props` | `object` | No | `{}` | Forwarded to the root settings content element. |

### `SettingsContent`

Named export from `components/SettingsView.jsx`. Renders the compact settings form without the error boundary wrapper.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `children` | `ReactNode` | No | `undefined` | Optional content rendered before the default controls. |
| `loadData` | `Function` | No | `undefined` | Optional async loader. While pending, renders `Loading settings...`; resolved data sets the form defaults. |
| `...props` | `object` | No | `{}` | Forwarded to the root `div` with `data-testid="settings-content"`. |

## Helpers

`app/settings/page.js` also exports:

| Export | Description |
| --- | --- |
| `PAGE_SIZE` | Number of settings rows shown per page. |
| `SEARCH_DEBOUNCE_MS` | Delay before applying search text. |
| `DEFAULT_FILTERS` | Default filter state: category `all`, empty query. |
| `getSettingsLoadAnnouncement(settings, options)` | Builds the initial/filter live-region text. |
| `getSettingsShowingAnnouncement(shown, total)` | Builds the paging live-region text. |
| `applyFiltersToSettings(list, filters)` | Applies category and text filters to settings rows. |

## Minimal usage

```jsx
import SettingsView from "@/components/SettingsView";
import { SettingsPage } from "@/app/settings/page";

export function CompactSettings() {
  return (
    <SettingsView loadData={() => Promise.resolve({ email: "user@example.com", notifications: true })}>
      <p className="text-sm text-slate-400">Account preferences</p>
    </SettingsView>
  );
}

export function TestableSettingsPage() {
  return <SettingsPage loadSettings={() => Promise.resolve([])} />;
}
```
