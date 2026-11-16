import { loadJSON } from "@/lib/data";
import { productPlan } from "@/lib/product";
import { loadProduct } from "@/lib/product.server";

import Replay, { type ReplayData } from "./Replay";

export default async function ReplayPage() {
  const [d, product] = await Promise.all([
    loadJSON<ReplayData>("replay_d1031.json"),
    loadProduct(),
  ]);
  return <Replay d={d} product={product} deductibleLabel={productPlan(product).deductible_label} />;
}
