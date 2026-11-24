import SettingsView from "./SettingsView";
import { getDictionary, t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  const dict = getDictionary(await getLocale());
  return { title: t(dict, "settings.title"), description: t(dict, "settings.lead") };
}

export default function SettingsRoute() {
  return <SettingsView />;
}
