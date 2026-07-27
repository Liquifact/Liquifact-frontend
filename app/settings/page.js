"use client";

import { useCallback, useMemo } from "react";
import NavMenu from "../../components/NavMenu";
import InlineEditRow from "../../components/InlineEditRow";
import { copy } from "../copy/en";
import { useLocalStorage } from "../../lib/hooks/useLocalStorage";

/** Stable storage key shared across renders & tabs. */
const SETTINGS_STORAGE_KEY = "liquifact-settings-v1";

/**
 * Default values for a brand-new visitor. Stored values are merged on top
 * of these so legacy stored shapes continue to work without throwing.
 */
const DEFAULT_SETTINGS = {
  displayName: "",
  email: "",
};

// Keep the client-side limits explicit and shared with the validators. These
// are conservative storage/API-safe limits: display names fit common profile
// schemas and 254 is the maximum length of an email address.
const DISPLAY_NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

/**
 * Normalise a stored settings object so callers always get a complete shape.
 * Legacy payloads (e.g. a previous schema with fewer fields) are filled in
 * with the defaults; extra / unknown fields are ignored.
 */
function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return {
    displayName:
      typeof raw.displayName === "string" ? raw.displayName : DEFAULT_SETTINGS.displayName,
    email: typeof raw.email === "string" ? raw.email : DEFAULT_SETTINGS.email,
  };
}

/**
 * Validators for the settings fields. Each returns an error string or null.
 * They are hoisted outside the component so they have stable identity.
 */
const validateDisplayName = (value) => {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return copy.settings.errors.required;
  }
  if (trimmed.length < 2) {
    return copy.settings.errors.displayNameTooShort;
  }
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return copy.settings.errors.displayNameTooLong;
  }
  return null;
};

const validateEmail = (value) => {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return copy.settings.errors.required;
  }
  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return copy.settings.errors.emailTooLong;
  }
  // Conservative email check — local@domain.tld with no spaces, one '@',
  // and a TLD with at least 2 characters. Good enough for client-side
  // shape validation; the server remains the source of truth.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!EMAIL_RE.test(trimmed)) {
    return copy.settings.errors.invalidEmail;
  }
  return null;
};

/**
 * Settings page.
 *
 * Each row uses <InlineEditRow> with a per-field validator. Successful
 * saves update the underlying useLocalStorage entry; failures are
 * surfaced inline by the row (and announced via its polite live region).
 *
 * Storage payload shape: { displayName: string, email: string }
 */
export default function SettingsPage() {
  const [settings, setSettings] = useLocalStorage(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  const safeSettings = useMemo(() => normalizeSettings(settings), [settings]);

  const updateField = useCallback(
    (key) => (next) => {
      const merged = normalizeSettings({
        ...safeSettings,
        [key]: next,
      });
      setSettings(merged);
    },
    [safeSettings, setSettings]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <NavMenu />

      <main
        id="main-content"
        className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8"
        aria-labelledby="settings-heading"
      >
        <header className="mb-8 space-y-2">
          <h1
            id="settings-heading"
            className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl"
          >
            {copy.settings.pageTitle}
          </h1>
          <p className="text-base text-slate-400">{copy.settings.pageSub}</p>
        </header>

        <section
          aria-labelledby="settings-rows-heading"
          className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-6"
        >
          <h2
            id="settings-rows-heading"
            className="sr-only"
          >
            {copy.settings.pageTitle}
          </h2>

          <ul className="flex flex-col gap-4 list-none p-0 m-0">
            <InlineEditRow
              id="settings-display-name"
              label={copy.settings.fields.displayName.label}
              description={copy.settings.fields.displayName.description}
              placeholder={copy.settings.fields.displayName.placeholder}
              value={safeSettings.displayName}
              validate={validateDisplayName}
              onSave={updateField("displayName")}
              savedAnnouncement={copy.settings.savedAnnouncement}
              cancelledAnnouncement={copy.settings.cancelledAnnouncement}
            />

            <InlineEditRow
              id="settings-email"
              type="email"
              label={copy.settings.fields.email.label}
              description={copy.settings.fields.email.description}
              placeholder={copy.settings.fields.email.placeholder}
              value={safeSettings.email}
              validate={validateEmail}
              onSave={updateField("email")}
              savedAnnouncement={copy.settings.savedAnnouncement}
              cancelledAnnouncement={copy.settings.cancelledAnnouncement}
            />
          </ul>
        </section>
      </main>
    </div>
  );
}

/** Exported for tests to assert normalisation shape without rendering. */
export {
  normalizeSettings,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  validateDisplayName,
  validateEmail,
};
