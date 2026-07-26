import "@testing-library/jest-dom";
import {
  readDensity,
  writeDensity,
  toggleDensityValue,
  DENSITY_KEY,
  DEFAULT_DENSITY,
  VALID_DENSITIES,
} from "./uploadDensity";

describe("uploadDensity storage", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe("constants", () => {
    it("exports a namespaced key", () => {
      expect(DENSITY_KEY).toBe("liquifact:upload:density");
    });

    it("defaults to comfortable", () => {
      expect(DEFAULT_DENSITY).toBe("comfortable");
    });

    it("validates only comfortable and compact", () => {
      expect(VALID_DENSITIES).toEqual(["comfortable", "compact"]);
    });
  });

  describe("readDensity", () => {
    it("returns default when nothing is stored", () => {
      expect(readDensity()).toBe("comfortable");
    });

    it("returns stored comfortable", () => {
      localStorage.setItem(DENSITY_KEY, "comfortable");
      expect(readDensity()).toBe("comfortable");
    });

    it("returns stored compact", () => {
      localStorage.setItem(DENSITY_KEY, "compact");
      expect(readDensity()).toBe("compact");
    });

    it("falls back to default on invalid value", () => {
      localStorage.setItem(DENSITY_KEY, "spacious");
      expect(readDensity()).toBe("comfortable");
    });

    it("falls back to default on empty string", () => {
      localStorage.setItem(DENSITY_KEY, "");
      expect(readDensity()).toBe("comfortable");
    });

    it("falls back to default when localStorage.getItem throws", () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("quota exceeded");
      });
      expect(readDensity()).toBe("comfortable");
    });
  });

  describe("writeDensity", () => {
    it("writes comfortable", () => {
      writeDensity("comfortable");
      expect(localStorage.getItem(DENSITY_KEY)).toBe("comfortable");
    });

    it("writes compact", () => {
      writeDensity("compact");
      expect(localStorage.getItem(DENSITY_KEY)).toBe("compact");
    });

    it("does not write invalid value", () => {
      writeDensity("spacious");
      expect(localStorage.getItem(DENSITY_KEY)).toBeNull();
    });

    it("does not throw when localStorage.setItem fails", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("private mode");
      });
      expect(() => writeDensity("compact")).not.toThrow();
    });
  });

  describe("toggleDensityValue", () => {
    it("toggles comfortable -> compact", () => {
      expect(toggleDensityValue("comfortable")).toBe("compact");
    });

    it("toggles compact -> comfortable", () => {
      expect(toggleDensityValue("compact")).toBe("comfortable");
    });
  });
});
