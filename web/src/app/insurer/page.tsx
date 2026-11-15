import { loadJSON } from "@/lib/data";
import type { Pricing } from "@/lib/types";

import Console, { type Anomaly, type Fairness, type Liquidity, type SM } from "./Console";

export default async function InsurerPage() {
  const [lq, pr, sm, fair, an] = await Promise.all([
    loadJSON<Liquidity>("liquidity.json"),
    loadJSON<Pricing>("pricing.json"),
    loadJSON<SM>("sitematch.json"),
    loadJSON<Fairness>("fairness.json"),
    loadJSON<Anomaly>("anomaly.json"),
  ]);
  return <Console lq={lq} pr={pr} sm={sm} fair={fair} an={an} />;
}
