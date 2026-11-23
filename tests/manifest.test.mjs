import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Import the manifest function.
const { default: manifest } = await import('../app/manifest.js');
const m = manifest();

describe('web app manifest', () => {
  it('has required top-level fields', () => {
    assert.ok(m.name, 'name is required');
    assert.ok(m.short_name, 'short_name is required');
    assert.ok(m.start_url, 'start_url is required');
    assert.ok(m.scope, 'scope is required');
    assert.ok(m.icons?.length > 0, 'icons must be non-empty');
  });

  it('has categories containing finance and business', () => {
    assert.ok(Array.isArray(m.categories), 'categories must be an array');
    assert.ok(m.categories.includes('finance'), 'finance category missing');
    assert.ok(m.categories.includes('business'), 'business category missing');
  });

  it('has exactly two shortcuts', () => {
    assert.ok(Array.isArray(m.shortcuts), 'shortcuts must be an array');
    assert.strictEqual(m.shortcuts.length, 2, 'expected exactly two shortcuts');
  });

  it('shortcut URLs are within scope', () => {
    const scope = m.scope ?? '/';
    for (const shortcut of m.shortcuts) {
      assert.ok(
        shortcut.url.startsWith(scope),
        `shortcut url "${shortcut.url}" is not within scope "${scope}"`
      );
    }
  });

  it('shortcuts reference /marketplace and /submit', () => {
    const urls = m.shortcuts.map((s) => s.url);
    assert.ok(urls.includes('/marketplace'), '/marketplace shortcut missing');
    assert.ok(urls.includes('/submit'), '/submit shortcut missing');
  });

  it('each shortcut has a name, short_name, url and icons', () => {
    for (const shortcut of m.shortcuts) {
      assert.ok(shortcut.name, 'shortcut.name is required');
      assert.ok(shortcut.short_name, 'shortcut.short_name is required');
      assert.ok(shortcut.url, 'shortcut.url is required');
      assert.ok(Array.isArray(shortcut.icons) && shortcut.icons.length > 0, 'shortcut.icons must be non-empty');
    }
  });

  it('icon files referenced in shortcuts exist under public/icons', () => {
    for (const shortcut of m.shortcuts) {
      for (const icon of shortcut.icons) {
        const filePath = join(ROOT, 'public', icon.src);
        assert.ok(existsSync(filePath), `icon file not found: ${filePath}`);
      }
    }
  });

  it('all manifest icon files exist under public/icons', () => {
    for (const icon of m.icons) {
      const filePath = join(ROOT, 'public', icon.src);
      assert.ok(existsSync(filePath), `icon file not found: ${filePath}`);
    }
  });
});
