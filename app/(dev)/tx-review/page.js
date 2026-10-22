import { notFound } from "next/navigation";
import TxReviewDemo from "./TxReviewDemo";

export const dynamic = "force-dynamic";

export default function TxReviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <TxReviewDemo />;
}
