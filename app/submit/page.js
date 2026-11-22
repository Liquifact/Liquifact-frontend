import { pageMeta } from "@/lib/seo";
import SubmitForm from "./SubmitForm";

export const metadata = pageMeta({
  path: "/submit",
  title: "Submit invoice",
  description: "List an unpaid invoice on LiquiFact for financing.",
});

export default function SubmitPage() {
  return <SubmitForm />;
}
