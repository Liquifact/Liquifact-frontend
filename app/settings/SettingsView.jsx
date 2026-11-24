"use client";

import { useEffect, useRef, useState } from "react";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useNotifications } from "@/components/NotificationsProvider";
import { useToast } from "@/components/toast/ToastProvider";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { clearLocalData, describeLocalData, LOCAL_DATA_CHANGED_EVENT } from "@/lib/localData";
import { readPref, resolveTheme, THEME_KEY } from "@/lib/theme";
import { DRAFT_KEY } from "@/lib/submitWizard";

function browserStorage(area = "localStorage") {
  try { return window[area]; } catch { return null; }
}

function describeDeviceData() {
  const local = describeLocalData(browserStorage());
  const session = describeLocalData(browserStorage("sessionStorage"), [DRAFT_KEY]);
  return { count: local.count + session.count, bytes: local.bytes + session.bytes, available: local.available && session.available };
}

function applyTheme(pref) {
  const theme = resolveTheme(pref, window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", theme === "dark" ? "#0a0e1f" : "#f7f8fc");
  });
}

export default function SettingsView() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const notifications = useNotifications();
  const [pref, setPref] = useState("system");
  const [summary, setSummary] = useState(null);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const dialog = useRef(null);
  const clearButton = useRef(null);
  const cancelButton = useRef(null);

  useEffect(() => {
    const update = () => {
      const storage = browserStorage();
      setPref(readPref(storage));
      setSummary(describeDeviceData());
    };
    update();
    window.addEventListener("storage", update);
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, update);
    };
  }, []);

  function chooseTheme(next) {
    setPref(next);
    applyTheme(next);
    try {
      const storage = browserStorage();
      if (!storage) throw new Error("unavailable");
      storage.setItem(THEME_KEY, next);
      window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT, { detail: { keys: [THEME_KEY] } }));
    } catch { toast.push({ kind: "error", title: t("settings.saveFailed") }); }
  }

  async function toggleNotifications() {
    if (permissionBusy) return;
    setPermissionBusy(true);
    try {
      const enabled = !notifications.browserEnabled;
      const result = await notifications.setBrowserEnabled(enabled);
      toast.push({ kind: result === "granted" || result === "disabled" ? "success" : "error",
        title: t(`settings.notifications.${result === "granted" ? "enabled" : result}`) });
      setSummary(describeDeviceData());
    } catch { toast.push({ kind: "error", title: t("settings.notifications.failed") }); }
    finally { setPermissionBusy(false); }
  }

  function closeDialog() {
    dialog.current?.close();
    clearButton.current?.focus();
  }

  function confirmClear() {
    const storage = browserStorage();
    const result = clearLocalData(storage);
    const sessionResult = clearLocalData(browserStorage("sessionStorage"), [DRAFT_KEY]);
    window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT, { detail: { keys: result.removed } }));
    if (result.removed.includes(THEME_KEY)) applyTheme("system");
    setPref(readPref(storage));
    setSummary(describeDeviceData());
    closeDialog();
    const success = result.success && sessionResult.success;
    toast.push({ kind: success ? "success" : "error", title: t(success ? "settings.cleared" : "settings.clearFailed") });
  }

  const notificationState = !notifications.supported ? "unsupported" : notifications.permission;
  return (
    <section className="section-sm settings-page">
      <div className="container">
        <header className="settings-heading">
          <p className="eyebrow">LiquiFact</p>
          <h1>{t("settings.title")}</h1>
          <p className="lead">{t("settings.lead")}</p>
        </header>
        <div className="grid grid-2 settings-grid">
          <section className="card" aria-labelledby="settings-appearance">
            <h2 id="settings-appearance">{t("settings.appearance")}</h2>
            <fieldset className="settings-themes">
              <legend>{t("settings.theme")}</legend>
              {["light", "dark", "system"].map((value) => (
                <label key={value} className="settings-theme">
                  <input type="radio" name="settings-theme" value={value} checked={pref === value} onChange={() => chooseTheme(value)} />
                  {t(`settings.theme.${value}`)}
                </label>
              ))}
            </fieldset>
            <div className="settings-language"><LocaleSwitcher id="settings-locale" /></div>
          </section>
          <section className="card" aria-labelledby="settings-notifications">
            <h2 id="settings-notifications">{t("settings.notifications.title")}</h2>
            <p className="muted" id="settings-notification-help">{t("settings.notifications.help")}</p>
            <label className="settings-check">
              <input type="checkbox" checked={notifications.browserEnabled} disabled={!notifications.supported || notifications.permission === "denied" || permissionBusy}
                onChange={toggleNotifications} aria-describedby="settings-notification-help settings-permission" />
              {t("settings.notifications.label")}
            </label>
            <p id="settings-permission" className="muted">{t("settings.notifications.permission", { permission: t(`settings.notifications.${notificationState}`) })}</p>
            {notifications.permission === "denied" && <p>{t("settings.notifications.blockedHelp")}</p>}
          </section>
          <section className="card settings-data" aria-labelledby="settings-local-data">
            <h2 id="settings-local-data">{t("settings.localData")}</h2>
            <p className="muted">{t("settings.dataHelp")}</p>
            <p role="status">{summary ? summary.available
              ? t("settings.summary", { count: summary.count, bytes: new Intl.NumberFormat(locale).format(summary.bytes) })
              : t("settings.storageUnavailable") : t("settings.loading")}</p>
            <button type="button" className="btn btn-ghost" ref={clearButton} disabled={!summary || permissionBusy} onClick={() => { dialog.current.showModal(); cancelButton.current?.focus(); }}>
              {t("settings.clear")}
            </button>
          </section>
        </div>
        <dialog ref={dialog} className="sme-confirm-dialog" aria-labelledby="settings-clear-title" aria-describedby="settings-clear-description"
          onCancel={(event) => { event.preventDefault(); closeDialog(); }}>
          <h2 id="settings-clear-title">{t("settings.confirmTitle")}</h2>
          <p id="settings-clear-description">{t("settings.confirmBody")}</p>
          <div className="btn-row">
            <button type="button" ref={cancelButton} className="btn btn-ghost" onClick={closeDialog}>{t("settings.cancel")}</button>
            <button type="button" className="btn btn-primary" onClick={confirmClear}>{t("settings.confirmClear")}</button>
          </div>
        </dialog>
      </div>
    </section>
  );
}
