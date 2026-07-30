import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  SETTINGS_UPDATED_KEY,
  readStoredSettings,
  writeStoredSettings,
  readStoredSettingsUpdatedAt,
  writeStoredSettingsUpdatedAt,
} from "@/lib/settingsStore";

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const mock = {
    getItem: jest.fn((k: string) => store[k] ?? null),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
  Object.defineProperty(window, "localStorage", { value: mock, writable: true });
  return { mock, store };
}

describe("readStoredSettings", () => {
  it("returns defaults when nothing is stored", () => {
    mockLocalStorage({});
    expect(readStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("returns stored settings merged over defaults", () => {
    mockLocalStorage({ [SETTINGS_STORAGE_KEY]: JSON.stringify({ currency: "EUR" }) });
    expect(readStoredSettings()).toEqual({ ...DEFAULT_SETTINGS, currency: "EUR" });
  });

  it("falls back to defaults on malformed JSON", () => {
    mockLocalStorage({ [SETTINGS_STORAGE_KEY]: "{not-json" });
    expect(readStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back to defaults when stored value is not an object", () => {
    mockLocalStorage({ [SETTINGS_STORAGE_KEY]: JSON.stringify("a string") });
    expect(readStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back to defaults when localStorage throws", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      writable: true,
    });
    expect(readStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("writeStoredSettings", () => {
  it("persists settings as JSON", () => {
    const { store } = mockLocalStorage({});
    writeStoredSettings({ currency: "NGN", emailNotifications: false });
    expect(JSON.parse(store[SETTINGS_STORAGE_KEY])).toEqual({
      currency: "NGN",
      emailNotifications: false,
    });
  });

  it("does not throw when localStorage.setItem throws", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
      writable: true,
    });
    expect(() => writeStoredSettings(DEFAULT_SETTINGS)).not.toThrow();
  });
});

describe("readStoredSettingsUpdatedAt", () => {
  it("returns the stored numeric timestamp", () => {
    mockLocalStorage({ [SETTINGS_UPDATED_KEY]: "1700000000000" });
    expect(readStoredSettingsUpdatedAt()).toBe(1700000000000);
  });

  it("returns null when nothing is stored", () => {
    mockLocalStorage({});
    expect(readStoredSettingsUpdatedAt()).toBeNull();
  });

  it("returns null when the stored value is not numeric", () => {
    mockLocalStorage({ [SETTINGS_UPDATED_KEY]: "nope" });
    expect(readStoredSettingsUpdatedAt()).toBeNull();
  });

  it("returns null when localStorage throws", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      writable: true,
    });
    expect(readStoredSettingsUpdatedAt()).toBeNull();
  });
});

describe("writeStoredSettingsUpdatedAt", () => {
  it("persists the timestamp as a string", () => {
    const { store } = mockLocalStorage({});
    writeStoredSettingsUpdatedAt(1700000000000);
    expect(store[SETTINGS_UPDATED_KEY]).toBe("1700000000000");
  });

  it("does not throw when localStorage.setItem throws", () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
      writable: true,
    });
    expect(() => writeStoredSettingsUpdatedAt(Date.now())).not.toThrow();
  });
});
