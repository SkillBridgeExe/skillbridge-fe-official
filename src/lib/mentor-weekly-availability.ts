import type {
  MentorAvailabilityTemplateDto,
  MentorAvailabilityWindow,
  SaveMentorAvailabilityTemplateRequest,
} from "@/api/mentors";

export const DEFAULT_MENTOR_TEMPLATE_TIMEZONE = "Asia/Ho_Chi_Minh";
export const MENTOR_BUFFER_OPTIONS = [0, 15, 30] as const;

export type WeeklyAvailabilityValidationCode =
  | "invalidTime"
  | "overlap"
  | "tooShort";

export function createEmptyWeeklyAvailability(): MentorAvailabilityTemplateDto {
  return {
    timezone: DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
    bufferMinutes: 0,
    windows: [],
  };
}

export function timeInputToMinute(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return Number.NaN;
  return hour * 60 + minute;
}

export function minuteToTimeInput(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizeWeeklyAvailability(
  template: SaveMentorAvailabilityTemplateRequest,
): SaveMentorAvailabilityTemplateRequest {
  const bufferMinutes = template.bufferMinutes ?? 0;
  return {
    timezone: template.timezone || DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
    bufferMinutes: (MENTOR_BUFFER_OPTIONS as readonly number[]).includes(bufferMinutes)
      ? bufferMinutes
      : 0,
    windows: template.windows
      .filter((window) => window.isActive !== false)
      .map((window) => ({
        dayOfWeek: window.dayOfWeek,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
        isActive: true,
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute),
  };
}

export function validateWeeklyAvailability(
  windows: MentorAvailabilityWindow[],
  sessionDurationMinutes: number,
): WeeklyAvailabilityValidationCode[] {
  const errors = new Set<WeeklyAvailabilityValidationCode>();
  const activeWindows = windows.filter((window) => window.isActive !== false);

  for (const window of activeWindows) {
    if (
      window.dayOfWeek < 1 ||
      window.dayOfWeek > 7 ||
      window.startMinute < 0 ||
      window.startMinute >= 1440 ||
      window.endMinute <= window.startMinute ||
      window.endMinute > 1440
    ) {
      errors.add("invalidTime");
      continue;
    }
    if (window.endMinute - window.startMinute < sessionDurationMinutes) {
      errors.add("tooShort");
    }
  }

  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    const dayWindows = activeWindows
      .filter((window) => window.dayOfWeek === day)
      .sort((a, b) => a.startMinute - b.startMinute);
    for (let index = 1; index < dayWindows.length; index += 1) {
      if (dayWindows[index - 1].endMinute > dayWindows[index].startMinute) {
        errors.add("overlap");
      }
    }
  }

  return Array.from(errors);
}
