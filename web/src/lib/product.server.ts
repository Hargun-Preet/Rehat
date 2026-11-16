import { loadJSON } from "@/lib/data";

import type { ProductSpec } from "./product";

/** Server-side product data exported with the app for offline use. */
export async function loadProduct(): Promise<ProductSpec> {
  return loadJSON<ProductSpec>("product.json");
}
