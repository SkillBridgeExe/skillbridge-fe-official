const DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_MENTOR_RANGE_DAYS = 60;

function localDay(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function validateMentorDateRange(fromDate: string, toDate: string): string | null {
  if (!fromDate || !toDate) return "Choose both start and end dates.";
  const from = localDay(fromDate);
  const to = localDay(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return "Choose valid dates.";
  }
  if (to < from) return "End date must be on or after start date.";
  if (to.getTime() + DAY_MS - from.getTime() > MAX_MENTOR_RANGE_DAYS * DAY_MS) {
    return `Date range cannot exceed ${MAX_MENTOR_RANGE_DAYS} days.`;
  }
  return null;
}

export function mentorDateRangeToIso(fromDate: string, toDate: string) {
  const error = validateMentorDateRange(fromDate, toDate);
  if (error) throw new Error(error);
  const from = localDay(fromDate);
  const toExclusive = localDay(toDate);
  toExclusive.setDate(toExclusive.getDate() + 1);
  return { from: from.toISOString(), to: toExclusive.toISOString() };
}

export function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultMentorDateRange() {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 29);
  return { fromDate: dateInputValue(from), toDate: dateInputValue(to) };
}
