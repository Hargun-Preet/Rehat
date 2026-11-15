import { promises as fs } from "fs";
import path from "path";

/** Server-side: read precomputed JSON from public/data. Works with the engine stopped and Wi-Fi off. */
export async function loadJSON<T>(name: string): Promise<T> {
  const p = path.join(process.cwd(), "public", "data", name);
  return JSON.parse(await fs.readFile(p, "utf8")) as T;
}

export async function loadJSONOr<T>(name: string, fallback: T): Promise<T> {
  try {
    return await loadJSON<T>(name);
  } catch {
    return fallback;
  }
}
