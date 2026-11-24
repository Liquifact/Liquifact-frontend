import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import SettingsView from "../app/settings/SettingsView.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LocaleSwitcher from "../components/LocaleSwitcher.jsx";
import ToastProvider from "../components/toast/ToastProvider.jsx";
import { NotificationsProvider, useNotifications } from "../components/NotificationsProvider.jsx";
import { I18nProvider } from "../lib/i18n/I18nProvider.jsx";
import { getDictionary, LOCALE_COOKIE } from "../lib/i18n/index.js";
import { BROWSER_NOTIFICATIONS_KEY, STORAGE_KEYS } from "../lib/localData.js";
import SiteFooter from "../components/SiteFooter.jsx";
import SettingsRoute, { generateMetadata } from "../app/settings/page.js";

const { refreshRef } = vi.hoisted(() => ({ refreshRef: { current: () => {} } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => refreshRef.current() }) }));
vi.mock("@/lib/api", () => ({ listInvoices: vi.fn(async () => ({ data: [] })) }));
vi.mock("@/lib/i18n/server", () => ({ getLocale: async () => "en" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a> }));

function StateProbe() {
  const { unreadCount, followedIds } = useNotifications();
  return <output data-testid="notification-memory">{unreadCount}:{followedIds.length}</output>;
}

function Harness({ withHeader = false, withFooterLocale = false }) {
  const [locale, setLocale] = useState("en");
  refreshRef.current = () => setLocale(document.cookie.includes(`${LOCALE_COOKIE}=es`) ? "es" : "en");
  return <I18nProvider locale={locale} dict={getDictionary(locale)}>
    <ToastProvider><NotificationsProvider>
      {withHeader && <ThemeToggle />}
      <main><SettingsView /><StateProbe /></main>
      {withFooterLocale && <LocaleSwitcher />}
    </NotificationsProvider></ToastProvider>
  </I18nProvider>;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const notification = { permission: "default", requestPermission: vi.fn(async () => { notification.permission = "granted"; return "granted"; }) };
  vi.stubGlobal("Notification", notification);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });

test("the actual settings route has metadata and is linked from the footer", async () => {
  expect(SettingsRoute().type).toBe(SettingsView);
  expect(await generateMetadata()).toMatchObject({ title: "Settings" });
  render(await SiteFooter());
  expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
});

test("renders labelled settings and changes language with a unique select id", async () => {
  const user = userEvent.setup();
  render(<Harness withFooterLocale />);
  expect(screen.getByRole("heading", { name: "Settings", level: 1 })).toBeInTheDocument();
  const language = document.getElementById("settings-locale");
  expect(language).toHaveValue("en");
  expect(document.querySelectorAll('#locale-select')).toHaveLength(1);
  await user.selectOptions(language, "es");
  expect(document.cookie).toContain(`${LOCALE_COOKIE}=es`);
  expect(screen.getByRole("heading", { name: "Configuración", level: 1 })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Borrar datos locales" })).toBeInTheDocument();
});

test("restores theme and native radio changes synchronize the header and storage", async () => {
  localStorage.setItem("liquifact-theme", "dark");
  const user = userEvent.setup();
  render(<Harness withHeader />);
  const group = screen.getByRole("group", { name: "Theme" });
  await waitFor(() => expect(within(group).getByRole("radio", { name: "Dark" })).toBeChecked());
  await user.click(within(group).getByRole("radio", { name: "Light" }));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("liquifact-theme")).toBe("light");
  expect(within(screen.getByRole("radiogroup", { name: "Theme" })).getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  await user.keyboard("{ArrowRight}{ArrowRight}");
  expect(within(group).getByRole("radio", { name: "System" })).toBeChecked();
});

test("clearing requires confirmation, cancel preserves data, and confirm resets only app data and memory", async () => {
  for (const key of STORAGE_KEYS) localStorage.setItem(key, "fixture");
  localStorage.setItem("liquifact.notifications.v1", JSON.stringify({ version: 1, snapshot: {}, events: [{ id: "fixture", read: false }], followedIds: ["fixture"] }));
  localStorage.setItem("other-app", "keep");
  localStorage.setItem("wallet-secret", "keep");
  sessionStorage.setItem("liquifact-submit-draft", JSON.stringify({ sme: "Synthetic SME" }));
  sessionStorage.setItem("other-session", "keep");
  document.cookie = `${LOCALE_COOKIE}=es; path=/`;
  const user = userEvent.setup();
  render(<Harness />);
  await waitFor(() => expect(screen.getByTestId("notification-memory")).toHaveTextContent("1:1"));
  const clear = screen.getByRole("button", { name: "Clear local data" });
  await user.click(clear);
  let dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(clear).toHaveFocus();
  expect(localStorage.getItem("liquifact-submit-draft")).toBe("fixture");
  expect(sessionStorage.getItem("liquifact-submit-draft")).toContain("Synthetic SME");
  await user.click(clear);
  dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Confirm clear" }));
  expect(await screen.findByText("LiquiFact local data cleared.")).toBeInTheDocument();
  for (const key of STORAGE_KEYS) expect(localStorage.getItem(key)).toBeNull();
  expect(localStorage.getItem("other-app")).toBe("keep");
  expect(localStorage.getItem("wallet-secret")).toBe("keep");
  expect(sessionStorage.getItem("liquifact-submit-draft")).toBeNull();
  expect(sessionStorage.getItem("other-session")).toBe("keep");
  expect(document.cookie).toContain(`${LOCALE_COOKIE}=es`);
  expect(screen.getByTestId("notification-memory")).toHaveTextContent("0:0");
  expect(clear).toHaveFocus();
});

test("notifications request permission only on explicit enable and can be disabled without revoking permission", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const toggle = screen.getByRole("checkbox", { name: "Enable browser alerts" });
  await waitFor(() => expect(toggle).toBeEnabled());
  expect(Notification.requestPermission).not.toHaveBeenCalled();
  await user.click(toggle);
  expect(Notification.requestPermission).toHaveBeenCalledOnce();
  expect(toggle).toBeChecked();
  expect(localStorage.getItem(BROWSER_NOTIFICATIONS_KEY)).toBe("true");
  await user.click(toggle);
  expect(toggle).not.toBeChecked();
  expect(Notification.permission).toBe("granted");
  expect(Notification.requestPermission).toHaveBeenCalledOnce();
  expect(localStorage.getItem(BROWSER_NOTIFICATIONS_KEY)).toBe("false");
});

test.each(["denied", "unsupported"])("%s permission leaves an explained disabled control", async (state) => {
  if (state === "denied") Notification.permission = "denied";
  else vi.stubGlobal("Notification", undefined);
  render(<Harness />);
  expect(screen.getByRole("checkbox", { name: "Enable browser alerts" })).toBeDisabled();
  await screen.findByText(state === "denied" ? /Browser permission: Blocked/ : /Browser permission: Unavailable/);
});

test("permission rejection is announced without enabling browser alerts", async () => {
  Notification.requestPermission.mockRejectedValueOnce(new Error("private-error"));
  const user = userEvent.setup();
  render(<Harness />);
  const toggle = screen.getByRole("checkbox", { name: "Enable browser alerts" });
  await waitFor(() => expect(toggle).toBeEnabled());
  await user.click(toggle);
  expect(await screen.findByText("Browser permission could not be requested. Try again later.")).toBeInTheDocument();
  expect(toggle).not.toBeChecked();
});

test("throwing storage keeps controls usable and reports failed clearing accurately", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
  const user = userEvent.setup();
  render(<Harness />);
  await screen.findByText("Local storage is unavailable or some entries could not be read.");
  await user.click(screen.getByRole("button", { name: "Clear local data" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm clear" }));
  expect(await screen.findByText("Some LiquiFact data could not be cleared. Your browser may be blocking storage.")).toBeInTheDocument();
});

test("settings and the confirmation dialog have no accessibility violations", async () => {
  const user = userEvent.setup();
  const view = render(<Harness />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Clear local data" })).toBeEnabled());
  expect((await axe.run(view.container)).violations).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Clear local data" }));
  expect((await axe.run(screen.getByRole("dialog"))).violations).toEqual([]);
});
