import { loadJSON } from "@/lib/data";

import ReceiptView, { type ReceiptIndex } from "./ReceiptView";

export default async function ReceiptPage() {
  const index = await loadJSON<ReceiptIndex[]>("receipts_index.json");
  return <ReceiptView index={index} />;
}
