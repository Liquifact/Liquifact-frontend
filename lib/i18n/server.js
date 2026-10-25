import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./index.js";

/** Resolve the request locale in a server component. */
export async function getLocale() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
}
