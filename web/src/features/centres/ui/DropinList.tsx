import type { DropInProgram } from "../../../shared/types";

type Props = { programs: DropInProgram[] };


function safeTime(hhmmss?: string | null) {
  return hhmmss ? hhmmss.slice(0, 5) : null;
}

function timeLabel(p: DropInProgram) {
  const day = p.day_of_week ?? "";
  const st = safeTime(p.start_time);
  const et = safeTime(p.end_time);
  if (day && st && et) return `${day} ${st}-${et}`;
  if (day && st) return `${day} ${st}`;
  return day || "";
}

function formatAgeRange(min?: number | null, max?: number | null) {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) return `${min}-${max}`;
  if (hasMin) return `${min}+`;
  return `Under ${max}`;
}

function scheduleKey(p: DropInProgram) {
  const idLike =
    (p as any).course_id ??
    (p as any).course_code ??
    (p as any).program_id ??
    (p as any).activity ??
    (p as any).course_title ??
    "";

  const location = (p as any).location_id ?? (p as any).LocationID ?? "";
  const facility = (p as any).facility_id ?? (p as any).FacilityID ?? "";

  const day = p.day_of_week ?? "";
  const st = p.start_time ?? "";
  const et = p.end_time ?? "";

  const ageMin = p.age_min ?? "";
  const ageMax = p.age_max ?? "";
  const agePart = `${ageMin || ""}-${ageMax || ""}`;

  return `${idLike}__loc${location}__fac${facility}__${day}__${st}__${et}__age${agePart}`.replace(
    /\s+/g,
    "_"
  );
}

function dedupePrograms(programs: DropInProgram[]) {
  const seen = new Map<string, DropInProgram>();

  for (const p of programs) {
    const key = scheduleKey(p);
    if (!seen.has(key)) {
      seen.set(key, p);
    } else {
      // exact duplicate -> skip
      // If you want to keep duplicates anyway, append a counter here instead.
    }
  }
  return Array.from(seen.entries()).map(([key, p]) => ({ key, p }));
}

export default function DropinList({ programs }: Props) {
  const items = dedupePrograms(programs);

  if (!items.length) {
    return (
      <div className="info-section">
        <div className="info-value">No drop-in programs match your filters</div>
      </div>
    );
  }

  return (
    <div className="info-section">
      <h3>Results: </h3>
      <div className="program-list" id="dropin-list">
        {items.map(({ key, p }, i) => (
          <div className="program-item" key={key || `row-${i}`}>
            <div className="program-details" >
              {(p as any).course_title ?? (p as any).activity}
              {timeLabel(p) && (
                <>
                  {" – "}
                  {timeLabel(p)}
                </>
              )}
              {formatAgeRange(p.age_min, p.age_max) && (
                <>
                  {" "}
                  | Ages:{" "}
                  {formatAgeRange(p.age_min, p.age_max)}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
