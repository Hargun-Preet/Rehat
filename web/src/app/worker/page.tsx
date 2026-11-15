import { loadJSON } from "@/lib/data";

import Worker, { type WorkerData } from "./Worker";

export default async function WorkerPage() {
  return <Worker data={await loadJSON<WorkerData>("worker.json")} />;
}
