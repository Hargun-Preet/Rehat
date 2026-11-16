import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";
import type { Receipt } from "@/lib/types";

import Worker, { type WorkerData } from "./Worker";

type ReceiptIndex = { uen: string; firm: string; month: string };

export default async function WorkerPage() {
  const [data, product, index] = await Promise.all([
    loadJSON<WorkerData>("worker.json"),
    loadProduct(),
    loadJSON<ReceiptIndex[]>("receipts_index.json"),
  ]);
  const current = index.find((item) => item.firm === product.demo_firm.name && item.month === product.demo_clock.month);
  const receipt = current ? await loadJSON<Receipt>(`receipt_${current.uen}_${current.month}.json`) : null;
  const latestHeat = receipt?.hours.filter((hour) => hour.peril === "heat" && hour.ts.startsWith(product.demo_clock.today)).at(-1) ?? null;

  return <Worker data={data} product={product} latestHeat={latestHeat} stationName={receipt?.stations.primary.name ?? "the named station"} />;
}
