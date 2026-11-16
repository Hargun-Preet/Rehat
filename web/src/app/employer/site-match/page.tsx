import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";

import SiteMatch, { type SiteMatchData } from "./SiteMatch";

export default async function SiteMatchPage() {
  const [data, product] = await Promise.all([loadJSON<SiteMatchData>("sitematch.json"), loadProduct()]);
  return <SiteMatch data={data} product={product} />;
}
