export const WEEKDAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeekdayName = (typeof WEEKDAY_OPTIONS)[number];

export const WEEKDAY_INDEX: Record<WeekdayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function isWeekdayName(value: unknown): value is WeekdayName {
  return typeof value === "string" && value in WEEKDAY_INDEX;
}








