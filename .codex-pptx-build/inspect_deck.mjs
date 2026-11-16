import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const source = "/Users/mihirphalke/Downloads/Rehat_pitch_deck_v6.pptx";

try {
  const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
  const inspection = await presentation.inspect({
    kind: "slide,textbox,shape,table",
    search: "No change in the law|legal team|How Rehat complies|rate lock|two-year|compliant|approved",
    maxChars: 12000,
  });
  console.log(JSON.stringify(inspection, null, 2));
  for (const id of ["tb/y5o3ip87", "tb/qtwvyh8v"]) {
    const table = presentation.resolve(id);
    const cells = [];
    for (let row = 0; row < table.rows.length; row += 1) {
      const values = [];
      for (let col = 0; col < table.columns.length; col += 1) {
        values.push(table.getCell(row, col).value);
      }
      cells.push(values);
    }
    console.log(id, JSON.stringify(cells, null, 2));
  }
} catch (error) {
  console.error("DECK_INSPECTION_ERROR");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
