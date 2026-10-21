import { configureAxe } from "vitest-axe";

// jsdom has no layout or canvas, so colour contrast cannot be computed here;
// it is checked in a real browser instead.
export const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });
