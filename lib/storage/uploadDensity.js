const DENSITY_KEY = "liquifact:upload:density";
const VALID_DENSITIES = ["comfortable", "compact"];
const DEFAULT_DENSITY = "comfortable";

export function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readDensity() {
  if (!isBrowser()) return DEFAULT_DENSITY;
  try {
    const raw = window.localStorage.getItem(DENSITY_KEY);
    if (typeof raw === "string" && VALID_DENSITIES.includes(raw)) {
      return raw;
    }
  } catch {
    // Swallow
  }
  return DEFAULT_DENSITY;
}

export function writeDensity(value) {
  if (!isBrowser()) return;
  if (!VALID_DENSITIES.includes(value)) return;
  try {
    window.localStorage.setItem(DENSITY_KEY, value);
  } catch {
    // Swallow
  }
}

export function toggleDensityValue(current) {
  return current === "comfortable" ? "compact" : "comfortable";
}

export { DENSITY_KEY, VALID_DENSITIES, DEFAULT_DENSITY };
