import { getDictionary, t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import OfflineScreen from "./OfflineScreen";

export async function generateMetadata() {
  const dict = getDictionary(await getLocale());
  return { title: t(dict, "offline.title"), description: t(dict, "offline.lead") };
}

export default async function OfflinePage() {
  const dict = getDictionary(await getLocale());
  return <OfflineScreen dict={dict} />;
}
