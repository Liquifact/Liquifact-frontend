import { pageMeta } from "@/lib/seo";
import ActivityHistory from "./ActivityHistory";

export const metadata = pageMeta({
  path: "/activity",
  title: "Transaction history",
  description: "Review and export your recent Stellar transactions.",
});

export default function ActivityPage() {
  return <ActivityHistory />;
}