# PWA browser verification

Checked with a production build in Chrome at 1440px and 375px, in both palettes.
Before images show the original uncached demo fallback. After images use a local
API fixture, then browser offline mode: the last-seen invoice remains visible
with its saved timestamp. No live transaction was submitted.

| View | Before | After offline reload |
| --- | --- | --- |
| Desktop, light | [Before](before-1440-light.png) | [After](after-1440-light.png) |
| Desktop, dark | [Before](before-1440-dark.png) | [After](after-1440-dark.png) |
| 375px, light | [Before](before-375-light.png) | [After](after-375-light.png) |
| 375px, dark | [Before](before-375-dark.png) | [After](after-375-dark.png) |

[Update prompt with keyboard focus, 375px dark](update-375-dark.png).

- Offline list/detail reloads keep the fixture invoice; funding stays disabled.
- An uncached navigation shows the offline page; Enter on its recovery link opens the saved marketplace.
- No horizontal overflow at either viewport width. Banner text contrast: 16.2:1 light, 14.5:1 dark.
- Cache Storage inspection contains neither the fixture wallet address nor its signed-XDR field.
- Chrome `Page.getInstallabilityErrors` returns no errors in normal browser profiles.
- Lighthouse 11.7.1: `installable-manifest` score 1 and PWA category score 1. This version retains the PWA audit removed from newer Lighthouse releases.
- A changed worker waits until Reload is activated with Space; the focus ring is visible and the page then reloads.

Automated checks: `npm test` (17 tests), `npm run test:ui` (6 tests), and
`npm run build`, using Node 20.20.2. Existing tests remain unchanged.
