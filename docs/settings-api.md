# Settings component API

`/settings` provides device preferences and a confirmed local-data reset. It is linked from the product links in `components/SiteFooter.jsx`.

## Route and component

- `app/settings/page.js` exports `SettingsRoute` and localized `generateMetadata()`.
- `app/settings/SettingsView.jsx` exports the client `SettingsView`. It takes no props and runs within the existing `I18nProvider`, `ToastProvider` and `NotificationsProvider` from the application layout.
- Appearance uses labelled native theme radio inputs: light, dark and system. Changes apply immediately, persist using `liquifact-theme`, and synchronize the existing header toggle. System follows the browser's color preference.
- Language reuses `components/LocaleSwitcher.jsx`. Its optional `id` prop defaults to `locale-select`; settings uses `settings-locale` so the footer select has a distinct label target. Changes set the existing `liquifact-locale` cookie and refresh the route. English and Spanish are supported.
- Browser alerts use the existing notification provider. Permission is requested only on an explicit enable action and only if the browser has not already decided. Users can disable LiquiFact alerts without revoking browser permission. Blocked permission explains how to enable it in browser site settings; unsupported browsers keep the control disabled.
- Local data shows the number of known stored entries and an approximate byte count. A native modal dialog requires confirmation before deletion, focuses Cancel on opening, supports Escape and returns focus to the trigger. Success or partial failure appears through the existing accessible toast provider.

## Local-data helpers

`lib/localData.js` exports:

| Export | Contract |
| --- | --- |
| `STORAGE_KEYS` | Frozen list of known theme, notification, transaction, invoice-draft and browser-alert preference keys. |
| `describeLocalData(storage, keys = STORAGE_KEYS)` | Returns `{ entries, count, bytes, available }`. Each entry is `{ key, present, bytes, readable }`. Bytes estimate UTF-16 key/value storage, not an exact browser quota measurement. Optional keys are filtered against the known list. Raw values are never returned. Throwing or missing storage produces unreadable entries and `available: false`. |
| `clearLocalData(storage, keys = STORAGE_KEYS)` | Deduplicates and filters the requested keys through `STORAGE_KEYS`, calls only `removeItem`, and returns `{ removed, failed, success }`. It continues after individual failures. Unknown keys are never removed; `storage.clear()` is never used. `removed` means removal succeeded, including an already absent key. |
| `BROWSER_NOTIFICATIONS_KEY` | `liquifact-browser-notifications`; stores an explicit `true`/`false` alert preference. |
| `LOCAL_DATA_CHANGED_EVENT` | `liquifact-local-data-changed`; dispatched after settings changes with `{ detail: { keys } }` listing successfully changed keys. Providers listen to synchronize memory in the current tab. |

The reset inspects/clears known localStorage keys and also the current tab’s `liquifact-submit-draft` in sessionStorage, where the invoice form actually saves drafts. It does not clear other sessionStorage keys or drafts in other tabs.

Known keys are `liquifact-theme`, `liquifact.notifications.v1`, `liquifact-txs`, `liquifact-submit-draft` and `liquifact-browser-notifications`. Other apps' data, unknown keys, language cookies, wallet access and on-chain invoices are preserved. Clearing does not change a browser's notification permission. Alerts remain disabled until explicitly enabled again.

The notification store exposes `reload()` to rehydrate after deletion. Notification memory and followed invoices refresh immediately; a poll that finishes after all followed invoices are cleared does not recreate deleted state. Transaction and theme widgets also refresh after settings changes. The reset clears local history only; it does not cancel, alter or initiate any Stellar transaction.

## Verification

```sh
node --test tests/localData.test.mjs
node scripts/check-i18n.mjs
npm run test:ui -- tests-ui/SettingsView.test.jsx
npm test
npm run build
```

Tests use injected/throwing storage, synthetic notification and transaction data, and mocked browser permission calls. No production credentials or funded transactions are required.
