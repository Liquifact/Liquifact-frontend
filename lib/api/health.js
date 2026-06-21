const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function makeHealthResult(state, message, details = null) {
  return {
    state,
    message,
    details,
    checkedAt: new Date().toISOString(),
  };
}

async function fetchHealthOnce(apiUrl, fetcher, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(`${apiUrl}/health`, {
      signal: controller.signal,
    });
    const payload = await readJsonSafely(response);

    if (!response.ok) {
      return makeHealthResult(
        "degraded",
        `Backend returned HTTP ${response.status}.`,
        payload ?? { status: response.status },
      );
    }

    return makeHealthResult(
      "connected",
      payload?.message || "Backend health check succeeded.",
      payload,
    );
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    return makeHealthResult(
      "unreachable",
      timedOut
        ? `Backend health check timed out after ${timeoutMs / 1000}s.`
        : error?.message || "Backend health check failed.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Checks the backend health endpoint with abort, timeout, retry, and typed
 * status mapping so the UI can render resilient health states.
 */
export async function checkBackendHealth(
  apiUrl,
  {
    fetcher = fetch,
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  let result;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    result = await fetchHealthOnce(apiUrl, fetcher, timeoutMs);

    if (result.state === "connected" || attempt === retries) {
      return {
        ...result,
        attempts: attempt + 1,
      };
    }
  }

  return result;
}
