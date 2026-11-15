import { loadJSON } from "@/lib/data";

import Live, { type LiveData } from "./Live";

export default async function LivePage() {
  return <Live snapshot={await loadJSON<LiveData>("live.json")} />;
}
