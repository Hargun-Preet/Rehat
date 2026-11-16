import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";

import Worker, { type WorkerData } from "./Worker";

export default async function WorkerPage() {
  const [data, product] = await Promise.all([
    loadJSON<WorkerData>("worker.json"),
    loadProduct(),
  ]);
  return <Worker data={data} product={product} />;
}
