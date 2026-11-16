import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";

import Live, { type LiveData } from "./Live";

export default async function LivePage() {
  const [snapshot, product] = await Promise.all([loadJSON<LiveData>("live.json"), loadProduct()]);
  return <Live snapshot={snapshot} product={product} />;
}
