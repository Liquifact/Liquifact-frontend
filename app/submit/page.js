import { pageMeta } from "@/lib/seo";
import { getDictionary, t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import SubmitForm from "./SubmitForm";

export async function generateMetadata() {
  const dict = getDictionary(await getLocale());
  return pageMeta({
    path: "/submit",
    title: t(dict, "submit.meta.title"),
    description: t(dict, "submit.meta.description"),
  });
}

export default function SubmitPage() {
  return <SubmitForm />;
}
