import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";

import Console, { type Liquidity } from "./Console";

export default async function InsurerPage() {
  const [lq, product] = await Promise.all([
    loadJSON<Liquidity>("liquidity.json"),
    loadProduct(),
  ]);
  return <Console lq={lq} product={product} />;
}
