import { loadJSON } from "@/lib/data";

import Replay, { type ReplayData } from "./Replay";

export default async function ReplayPage() {
  return <Replay d={await loadJSON<ReplayData>("replay_d1031.json")} />;
}
