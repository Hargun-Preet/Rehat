export const sgd = (v: number, d = 0) =>
  `S$${v.toLocaleString("en-SG", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
export const num = (v: number, d = 2) => v.toLocaleString("en-SG", { minimumFractionDigits: d, maximumFractionDigits: d });
export const monthName = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-SG", { month: "long", year: "numeric" });
export const dayName = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
