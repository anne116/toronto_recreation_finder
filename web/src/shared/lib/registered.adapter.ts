import type { RegisteredCsvRow, RegisteredProgram } from "../types";

const pad2 = (n: string | number | null | undefined) =>
  String(n ?? "").padStart(2, "0");

const toNum = (v: string | number | null | undefined): number | undefined => {
  if (v === null || v === undefined || v === "" ) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function mapRegisteredCsvRow(row: RegisteredCsvRow): RegisteredProgram {
  const start_time =
    row["Start Hour"] && row["Start Min"]
      ? `${pad2(row["Start Hour"])}:${pad2(row["Start Min"])}:00`
      : null;

  const end_time =
    row["End Hour"] && row["End Min"]
      ? `${pad2(row["End Hour"])}:${pad2(row["End Min"])}:00`
      : null;

  return {
    // base normalized fields
    course_title: row["Course Title"]?.trim() ?? "",
    days_of_week: row["Days of The Week"]?.trim() ?? undefined,
    program_category: row["Program Category"]?.trim() ?? undefined,
    min_age: toNum(row["Min Age"]),
    max_age: toNum(row["Max Age"]),

    // per-occurrence normalized
    day_of_week: null, // you can derive a single day if you need
    start_time,
    end_time,

    // identifiers
    course_id: row.Course_ID || null,
    location_id: row["Location ID"] || null,

    // extra normalized fields used by UI
    section: row.Section?.trim() || null,
    activity_title: row["Activity Title"]?.trim() || null,
    from_to: row["From To"]?.trim() || null,
    activity_url: row["Activity URL"]?.trim() || null,
    status_info: row["Status / Information"]?.trim() || null,
  };
}
