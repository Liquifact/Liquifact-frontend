import fs from 'node:fs';
import path from 'node:path';

const globalsCss = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');

function readHexToken(name) {
  const match = globalsCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));

  if (!match) {
    throw new Error(`Missing --${name} token`);
  }

  return match[1];
}

function channelToLinear(value) {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);

  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}

describe('global theme tokens', () => {
  it('keeps the dark UI palette as the default base theme', () => {
    expect(readHexToken('background')).toBe('#020617');
    expect(readHexToken('foreground')).toBe('#f1f5f9');
    expect(readHexToken('brand-cyan')).toBe('#06b6d4');
    expect(globalsCss).not.toContain('--background: #ffffff');
  });

  it('applies the loaded Geist font instead of an Arial override', () => {
    expect(globalsCss).toContain('font-family: var(--font-geist-sans), sans-serif');
    expect(globalsCss).not.toContain('Arial');
    expect(globalsCss).not.toContain('Helvetica');
  });

  it.each([
    ['body text', 'foreground', 4.5],
    ['muted slate-400 text', 'muted', 4.5],
    ['muted slate-500 text', 'muted-strong', 4.5],
  ])('keeps %s at WCAG AA contrast on slate-950', (_label, token, minimumRatio) => {
    const ratio = contrastRatio(readHexToken(token), readHexToken('background'));

    expect(ratio).toBeGreaterThanOrEqual(minimumRatio);
  });
});
