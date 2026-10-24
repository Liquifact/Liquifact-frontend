import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServiceWorkerRegistrar from "../components/pwa/ServiceWorkerRegistrar.jsx";
import OfflineNotice from "../components/pwa/OfflineNotice.jsx";
import OfflinePage from "../app/offline/page.js";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function workerMock(waiting = { postMessage: vi.fn() }) {
  const registration = Object.assign(new EventTarget(), { waiting, installing: null });
  const serviceWorker = Object.assign(new EventTarget(), { controller: {}, register: vi.fn().mockResolvedValue(registration) });
  vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { serviceWorker }));
  return { serviceWorker, registration, waiting };
}

beforeEach(() => { vi.stubEnv("NODE_ENV", "production"); });

test("registers a module worker at root, announces a waiting update, and only activates after keyboard consent", async () => {
  const { serviceWorker, waiting } = workerMock();
  const reload = vi.fn();
  vi.stubGlobal("location", { protocol: "http:", hostname: "localhost", reload });
  const user = userEvent.setup();
  render(<ServiceWorkerRegistrar />);
  const button = await screen.findByRole("button", { name: "Reload" });
  expect(serviceWorker.register).toHaveBeenCalledWith("/sw.js", { scope: "/", type: "module", updateViaCache: "none" });
  expect(screen.getByRole("status").textContent).toContain("Update available");
  expect(waiting.postMessage).not.toHaveBeenCalled();
  serviceWorker.dispatchEvent(new Event("controllerchange"));
  expect(reload).not.toHaveBeenCalled();
  await user.tab(); expect(document.activeElement).toBe(button);
  await user.keyboard(" ");
  expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  serviceWorker.dispatchEvent(new Event("controllerchange"));
  expect(reload).toHaveBeenCalledOnce();
});

test("Enter activates Reload and Shift+Tab keeps normal non-modal focus order", async () => {
  const { waiting } = workerMock();
  vi.stubGlobal("location", { protocol: "https:", hostname: "example.test", reload: vi.fn() });
  const user = userEvent.setup();
  render(<><a href="/marketplace">Marketplace</a><ServiceWorkerRegistrar /></>);
  const button = await screen.findByRole("button", { name: "Reload" });
  await user.tab(); await user.tab(); expect(document.activeElement).toBe(button);
  await user.tab({ shift: true }); expect(document.activeElement).toBe(screen.getByRole("link"));
  await user.tab(); await user.keyboard("{Enter}");
  expect(waiting.postMessage).toHaveBeenCalledOnce();
});

test("does not register in development or on insecure non-localhost origins", async () => {
  const { serviceWorker } = workerMock();
  vi.stubEnv("NODE_ENV", "development");
  const { unmount } = render(<ServiceWorkerRegistrar />);
  expect(serviceWorker.register).not.toHaveBeenCalled(); unmount();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubGlobal("location", { protocol: "http:", hostname: "example.test" });
  render(<ServiceWorkerRegistrar />);
  expect(serviceWorker.register).not.toHaveBeenCalled();
});

test("announces registration failure without disrupting online use", async () => {
  const { serviceWorker } = workerMock(null);
  vi.stubGlobal("location", { protocol: "https:", hostname: "example.test" });
  serviceWorker.register.mockRejectedValue(new Error("blocked"));
  render(<ServiceWorkerRegistrar />);
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Offline access could not be enabled"));
});

test("stale status includes a saved timestamp and distinguishes uncached demo fallback", () => {
  const { rerender } = render(<OfflineNotice offline stale cachedAt="2026-10-19T10:42:00Z" />);
  expect(screen.getByRole("status").textContent).toContain("Offline — showing data from");
  expect(document.querySelector("time").dateTime).toBe("2026-10-19T10:42:00.000Z");
  expect(screen.queryByText(/demo data/)).toBeNull();
  rerender(<OfflineNotice offline />);
  expect(screen.getByRole("status").textContent).toContain("showing demo data");
});

test("offline recovery uses a normal keyboard reachable full navigation link", async () => {
  const user = userEvent.setup(); render(<OfflinePage />);
  const link = screen.getByRole("link", { name: "Open saved marketplace" });
  expect(link.getAttribute("href")).toBe("/marketplace");
  await user.tab(); expect(document.activeElement).toBe(link);
});
