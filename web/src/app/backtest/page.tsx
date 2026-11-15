import { loadJSON } from "@/lib/data";
import type { Backtest, Pricing } from "@/lib/types";

import Lab, { type Grid, type Validation } from "./Lab";

export default async function BacktestPage() {
  const [bt, grid, pr, val] = await Promise.all([
    loadJSON<Backtest>("backtest.json"),
    loadJSON<Grid>("backtest_grid.json"),
    loadJSON<Pricing>("pricing.json"),
    loadJSON<Validation>("wbgt_validation.json"),
  ]);
  return <Lab bt={bt} grid={grid} premium={pr.plans.find((p) => p.plan === "Standard")!.year} val={val} />;
}
