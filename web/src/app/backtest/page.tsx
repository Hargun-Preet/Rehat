import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";
import type { Backtest } from "@/lib/types";

import Lab, { type Grid, type Validation } from "./Lab";

export default async function BacktestPage() {
  const [bt, grid, val, product] = await Promise.all([
    loadJSON<Backtest>("backtest.json"),
    loadJSON<Grid>("backtest_grid.json"),
    loadJSON<Validation>("wbgt_validation.json"),
    loadProduct(),
  ]);
  return <Lab bt={bt} grid={grid} product={product} val={val} />;
}
