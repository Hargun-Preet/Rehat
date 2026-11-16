import { Presentation, PresentationFile } from "@oai/artifact-tool";

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const slide = presentation.slides.add();
slide.charts.add("bar", {
  position: { left: 72, top: 72, width: 600, height: 320 },
  categories: ["All"],
  series: [
    { name: "Claims", values: [65], fill: "#14171C" },
    { name: "Expenses", values: [20], fill: "#A63A0A" },
  ],
  barOptions: { direction: "bar", grouping: "percentStacked" },
  dataLabels: { showValue: true, position: "center" },
});
await (await PresentationFile.exportPptx(presentation)).save("/Users/mihirphalke/GitHub Repos/ChaiKopi/.codex-pptx-build/test-chart.pptx");
