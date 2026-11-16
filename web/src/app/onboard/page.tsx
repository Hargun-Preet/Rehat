import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";

import Onboard, { type OnboardData, type StationsData } from "./Onboard";

export default async function OnboardPage() {
  const [legacyData, stations, product] = await Promise.all([loadJSON<{ firm: { site: OnboardData["site"]; primary_station: string; backup_station: string; rain_gauge: string; psi_region: string; meal_hour: number }; station_reason: string; suggestion: OnboardData["suggestion"] }>("onboarding.json"), loadJSON<StationsData>("stations.json"), loadProduct()]);
  const data: OnboardData = {
    ...legacyData.firm,
    site: {
      ...legacyData.firm.site,
      address: legacyData.firm.site.address.replace(" (fictional)", ""),
    },
    station_reason: legacyData.station_reason,
    suggestion: legacyData.suggestion,
  };
  return <Onboard data={data} stations={stations} product={product} />;
}
