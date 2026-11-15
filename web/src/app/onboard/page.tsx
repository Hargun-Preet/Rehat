import { loadJSON } from "@/lib/data";

import Onboard, { type OnboardData, type StationsData } from "./Onboard";

export default async function OnboardPage() {
  const [data, stations] = await Promise.all([loadJSON<OnboardData>("onboarding.json"), loadJSON<StationsData>("stations.json")]);
  return <Onboard data={data} stations={stations} />;
}
