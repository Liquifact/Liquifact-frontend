import { useEffect, useState } from "react";

/**
 * Returns a value after it has stayed unchanged for the requested delay.
 *
 * @param {*} value - The value to debounce.
 * @param {number} delay - Delay in milliseconds before publishing a change.
 * @returns {*} The latest settled value.
 */
export default function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
