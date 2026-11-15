import { loadJSON } from "@/lib/data";

import SiteMatch, { type SiteMatchData } from "./SiteMatch";

export default async function SiteMatchPage() {
  return <SiteMatch data={await loadJSON<SiteMatchData>("sitematch.json")} />;
}
