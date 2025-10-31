import type { DropInProgram } from "../../shared/types";

// If backend lacks activity, infer from course title.
function fallbackActivityFromTitle(title: string): string {
  const lower = title.toLowerCase();
  const known = ["badminton","basketball","pickleball","table tennis","swim","yoga","dance","gym"];
  const hit = known.find(k => lower.includes(k));
  return hit ? (hit === "table tennis" ? "Table Tennis" : hit[0].toUpperCase() + hit.slice(1)) : "Other";
}

export function getSports(programs: DropInProgram[]): string[] {
  const set = new Set<string>();
  for (const p of programs) {
    const sport = (p.activity && p.activity.trim()) || fallbackActivityFromTitle(p.course_title);
    set.add(sport);
  }
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

export type ScheduleKey = string; // e.g., "Monday 18:00–19:00"

export function fmtTime(t?: string | null): string {
  if (!t) return "";
  return t.slice(0,5); // HH:MM:SS -> HH:MM
}

export function scheduleKey(p: DropInProgram): ScheduleKey {
  const day = p.day_of_week ?? "";
  const start = fmtTime(p.start_time);
  const end = fmtTime(p.end_time);
  return `${day} ${start}${end ? "–" + end : ""}`.trim();
}

export function getSchedulesForSport(programs: DropInProgram[], sport: string): ScheduleKey[] {
  const set = new Set<ScheduleKey>();
  for (const p of programs) {
    const s = (p.activity && p.activity.trim()) || fallbackActivityFromTitle(p.course_title);
    if (s === sport) set.add(scheduleKey(p));
  }
  return Array.from(set).sort();
}

export function filterBySportAndSchedule(
  programs: DropInProgram[],
  sport?: string | null,
  sk?: ScheduleKey | null
): DropInProgram[] {
  return programs.filter(p => {
    const s = (p.activity && p.activity.trim()) || fallbackActivityFromTitle(p.course_title);
    if (sport && s !== sport) return false;
    if (sk) return scheduleKey(p) === sk;
    return true;
  });
}
