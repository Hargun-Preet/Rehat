import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const deckPath = "/Users/mihirphalke/GitHub Repos/ChaiKopi/deliverables/Rehat_pitch_deck_v9.pptx";
const outputDir = "/Users/mihirphalke/GitHub Repos/ChaiKopi/.codex-pptx-build/final-renders";
await fs.mkdir(outputDir, { recursive: true });

const presentation = await PresentationFile.importPptx(await FileBlob.load(deckPath));
const slides = await presentation.inspect({ kind: "slide", maxChars: 12000 });
for (const record of slides.records) {
  const slide = presentation.resolve(record.id);
  const blob = await slide.export({ format: "png", scale: 2 });
  const name = `slide-${String(record.slideIndex + 1).padStart(2, "0")}.png`;
  await fs.writeFile(path.join(outputDir, name), Buffer.from(await blob.arrayBuffer()));
}
console.log(JSON.stringify({ slides: slides.recordCount, outputDir }, null, 2));
