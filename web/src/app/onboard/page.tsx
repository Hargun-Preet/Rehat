import { loadJSON } from "@/lib/data";
import { loadProduct } from "@/lib/product.server";

import Onboard, { type OnboardData, type StationsData } from "./Onboard";

type OnboardPageProps = {
  searchParams: Promise<{ plan?: string; step?: string }>;
};

type OnboardingPayload = {
  firm: { site: OnboardData["site"]; primary_station: string; backup_station: string; rain_gauge: string; psi_region: string; meal_hour: number };
  station_reason: string;
  suggestion: OnboardData["suggestion"];
  monthly_deductibles?: OnboardData["monthly_deductibles"];
  first_payout_date?: string;
};

export default async function OnboardPage({ searchParams }: OnboardPageProps) {
  const [legacyData, stations, product, query] = await Promise.all([
    loadJSON<OnboardingPayload>("onboarding.json"),
    loadJSON<StationsData>("stations.json"),
    loadProduct(),
    searchParams,
  ]);
  const requestedPlan = query.plan?.trim().toLowerCase();
  const initialPlanId = requestedPlan && product.plans.some((plan) => plan.id === requestedPlan) ? requestedPlan : product.demo_firm.plan;
  const initialStep = query.step?.trim().toLowerCase() === "deductible" ? 1 : 0;
  const data: OnboardData = {
    ...legacyData.firm,
    site: {
      ...legacyData.firm.site,
      address: legacyData.firm.site.address.replace(" (fictional)", ""),
    },
    station_reason: legacyData.station_reason,
    suggestion: legacyData.suggestion,
    monthly_deductibles: legacyData.monthly_deductibles,
    first_payout_date: legacyData.first_payout_date,
  };
  return <Onboard data={data} stations={stations} product={product} initialPlanId={initialPlanId} initialStep={initialStep} />;
}
