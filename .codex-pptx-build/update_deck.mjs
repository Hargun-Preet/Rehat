import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/mihirphalke/GitHub Repos/ChaiKopi";
const sourcePath = "/Users/mihirphalke/Downloads/Rehat_pitch_deck_v6.pptx";
const buildDir = path.join(workspaceDir, ".codex-pptx-build");
const previewDir = path.join(buildDir, "previews");
const finalPath = path.join(workspaceDir, "deliverables", "Rehat_pitch_deck_v9.pptx");
const skillDir = "/Users/mihirphalke/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations";
const runtimePython = "/Users/mihirphalke/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const { finalizePresentation } = await import(pathToFileURL(
  path.join(skillDir, "container_tools/artifact_tool_utils.mjs"),
).href);

await fs.mkdir(previewDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });

const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
const priceSlide = presentation.resolve("sl/gnmp4jqx");
const economicsSlide = presentation.resolve("sl/fu1gfa1s");
const normalSlide = presentation.slides.getItem(5);
const product = JSON.parse(await fs.readFile(path.join(workspaceDir, "data/seed/product.json"), "utf8"));
async function saveBlob(blob, destination) {
  await fs.writeFile(destination, Buffer.from(await blob.arrayBuffer()));
}

await saveBlob(await priceSlide.export({ format: "png", scale: 2 }), path.join(previewDir, "source-slide-7.png"));
await saveBlob(await economicsSlide.export({ format: "png", scale: 2 }), path.join(previewDir, "source-slide-8.png"));

function setText(id, text) {
  const shape = presentation.resolve(id);
  shape.text = text;
}

// The imported deck's charts lose their workbook relationships on export. Rebuild
// the two source charts with the supplied data so they remain editable in PowerPoint.
presentation.delete(["ch/ytwnq1w7", "ch/q5obupw3"]);
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
normalSlide.charts.add("combo", {
  position: { left: 72, top: 220.8, width: 700.8, height: 412.8 },
  title: "Downtime hours per worker, by month",
  titleTextStyle: { fontFamily: "Arial", fontSize: 18, color: "#14171C" },
  categories: months,
  groups: [
    {
      type: "bar",
      series: [
        { name: "Normal heat rest", values: [0.3, 0.8, 1.9, 2.6, 2.6, 1.6, 1.3, 1.3, 1.3, 1.4, 0.6, 0.3], fill: "#E8590C" },
        { name: "Normal heavy rain", values: [4.2, 2, 2.9, 3.1, 3.1, 2.6, 2.8, 2.8, 2.4, 3.2, 4.8, 6.3], fill: "#B9AF9B" },
      ],
      barOptions: { direction: "column", grouping: "stacked", gapWidth: 70 },
    },
    {
      type: "line",
      series: [{ name: "Allowance (normal + 25%)", values: [5.6, 3.5, 6, 7.1, 7.1, 5.2, 5.1, 5.1, 4.6, 5.8, 6.8, 8.3], line: { fill: "#00467A", style: "solid", width: 2 } }],
      lineOptions: { smooth: false },
    },
  ],
  hasLegend: true,
  legend: { position: "bottom", textStyle: { fontFamily: "Arial", fontSize: 11, color: "#4A4D52" } },
  xAxis: { textStyle: { fontFamily: "Arial", fontSize: 10, color: "#4A4D52" } },
  yAxis: { min: 0, max: 10, majorGridlines: { fill: "#D5CDBE", style: "solid", width: 1 }, textStyle: { fontFamily: "Arial", fontSize: 10, color: "#4A4D52" } },
});

const splitColors = { claims: "#14171C", expenses: "#A63A0A", reinsurance: "#E8590C", profit: "#B9AF9B" };
priceSlide.charts.add("bar", {
  position: { left: 691.2, top: 220.8, width: 518.4, height: 192 },
  title: "Where each premium dollar goes (%)",
  titleTextStyle: { fontFamily: "Arial", fontSize: 18, color: "#14171C" },
  categories: ["Plan"],
  series: product.premium_split.map((part) => ({
    name: part.id === "claims" ? "Back to firms as claims" : part.label,
    values: [Math.round(part.share * 100)],
    fill: splitColors[part.id],
  })),
  hasLegend: true,
  legend: { position: "bottom", textStyle: { fontFamily: "Arial", fontSize: 11, color: "#4A4D52" } },
  barOptions: { direction: "bar", grouping: "percentStacked", gapWidth: 45 },
  dataLabels: { showValue: true, position: "center", textStyle: { fontFamily: "Arial", fontSize: 11, color: "#FFFFFF" } },
  xAxis: { deleted: true },
  yAxis: { deleted: true },
});

setText("sh/a9ojq5kz", "S$1,565");
setText("sh/o761ov2t", "Fixed benefit");
setText("sh/f2d0b6lc", "S$8 for every insured hour, on every plan");
setText("sh/id4ju1oz", "Optional break log");
setText("sh/jedkn654", "It helps record compliance. It is never a condition of payout.");

setText("sh/g72x4zyd", "65% claims, 20% expenses, 5% reinsurance, 10% profit");
setText("sh/ri9g7uhw", "Plan split: 65% claims, 20% expenses, 5% reinsurance and 10% profit. Simulation: 400,000 years calibrated to the back-test. Firm numbers are our plan, not a forecast.");
setText("sh/sjix0zy1", "Three-year planned profit: S$544,613. Income keeps the pilot’s risk itself, then buys stop-loss cover from year 2, which is why year 2 dips.");
setText("sh/o7ydoret", "years make a profit after all expenses. Loss years are very wet years and severe haze years");
setText("sh/bq9orito", "Legal review is next");
setText("sh/o3i5w3ad", "Designed to be confirmed by Income's legal team. This concept prototype is not legal advice.");

// The supplied legal-check table used a claim the product cannot make. Keep the
// editable table, but describe it as an implementation design pending review.
presentation.resolve("tb/y5o3ip87").cells.set(0, 1, "How Rehat is designed to work");
presentation.resolve("tb/qtwvyh8v").cells.set(2, 1, "Three deductible plans on slide 7; fixed S$8 benefit on every plan");

const after = await presentation.inspect({
  kind: "slide,textbox,shape",
  search: "S$1,565|Fixed benefit|Optional break log|65% claims|very wet years|S$544,613",
  maxChars: 12000,
});
if (after.recordCount < 5) throw new Error(`Expected revised deck text, found ${after.recordCount} records.`);
const prohibited = await presentation.inspect({
  kind: "slide,textbox,shape,table",
  search: "No change in the law|How Rehat complies|Rate lock|Two-year price guarantee",
  maxChars: 12000,
});
if (prohibited.recordCount > 0) throw new Error(`Outdated deck text remains: ${JSON.stringify(prohibited.records)}`);

await saveBlob(await priceSlide.export({ format: "png", scale: 2 }), path.join(previewDir, "revised-slide-7.png"));
await saveBlob(await economicsSlide.export({ format: "png", scale: 2 }), path.join(previewDir, "revised-slide-8.png"));

const stagingDir = path.join(workspaceDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "Rehat_pitch_deck_v9.candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 21,
  sourceTemplatePath: sourcePath,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [6, 7],
  nativeChartTargetApplication: "powerpoint",
};
const fontPolicy = {
  basis: "reference",
  families: ["Arial"],
  referencePath: sourcePath,
  referenceSha256: "50a5fa017a49a7f265c777607b6de8704e038d114be93db48313f379b8ad96fb",
};
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  nativeChartTargetApplication: "powerpoint",
  fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "Rehat_pitch_deck_v9.validation.json"),
});

console.log(JSON.stringify({ finalPath, validation: result, after: after.records.map((record) => record.text ?? record.title) }, null, 2));
