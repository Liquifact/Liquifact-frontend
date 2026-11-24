# Settings data flow

The actual settings route is `app/settings/page.js`; its client interface is `app/settings/SettingsView.jsx`. Component/helper contracts are described in [settings-api.md](./settings-api.md).

## Preferences

On mount, settings reads the theme using `readPref()` and inspects only the keys in `STORAGE_KEYS`. Missing or inaccessible storage displays a useful status without crashing the page.

Theme radio changes apply the existing light/dark tokens, persist the preference and notify the header toggle through `LOCAL_DATA_CHANGED_EVENT`. System theme follows the browser preference through the existing header listener. A failed write is reported through a toast while the selected appearance remains usable for the visit.

The settings language select reuses `LocaleSwitcher`: it writes the `liquifact-locale` cookie, announces the selected language and refreshes the route/provider dictionary. Both settings and footer selects use distinct IDs.

Browser alerts are controlled by `NotificationsProvider`. The user clicks to enable, the browser permission prompt runs only if needed, and a successful result stores the explicit alert preference. Disabling alerts stores `false` and prevents system notifications while keeping in-app invoice tracking. Blocked and unsupported permissions remain visible. Browser site settings control permission revocation.

## Confirmed reset

1. Settings inspects known localStorage entries plus the current tab’s sessionStorage invoice draft and shows an entry count and estimated UTF-16 storage bytes; it never renders the stored values.
2. Clear local data opens a native dialog with Cancel initially focused. Escape or Cancel preserves all data.
3. Confirm calls `clearLocalData()` for the closed set of known localStorage keys and the sessionStorage draft key. Failed removals do not stop later removals and are included in the result.
4. Successfully removed keys are announced through `LOCAL_DATA_CHANGED_EVENT`. Theme resets to system when its key was removed. The notification store reloads, followed invoices and unread state reset, and transaction widgets refresh local history.
5. A success or failure toast reports the result and focus returns to the trigger. Language cookies, other apps' storage, wallet access and blockchain state are preserved.

An invoice-monitor response arriving after the reset is ignored when the followed set is empty. The settings reset never signs or submits a transaction, removes private keys or changes funded state.

## Tests

- `tests/localData.test.mjs`: known-key boundaries, byte estimates, partial failures, throwing storage, memory reload and the in-flight monitor boundary.
- `tests-ui/SettingsView.test.jsx`: labels, locale refresh, theme synchronization, confirmation/cancel focus, permission outcomes, reset feedback and accessibility.
