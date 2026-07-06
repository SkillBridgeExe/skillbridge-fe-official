import { describe, expect, it } from "vitest";
import {
  DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
  createEmptyWeeklyAvailability,
  minuteToTimeInput,
  normalizeWeeklyAvailability,
  timeInputToMinute,
  validateWeeklyAvailability,
} from "./mentor-weekly-availability";

describe("mentor weekly availability helpers", () => {
  it("creates an empty template with Vietnam timezone and no buffer", () => {
    expect(createEmptyWeeklyAvailability()).toEqual({
      timezone: DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
      bufferMinutes: 0,
      windows: [],
    });
  });

  it("converts between time inputs and minutes", () => {
    expect(timeInputToMinute("09:30")).toBe(570);
    expect(minuteToTimeInput(570)).toBe("09:30");
  });

  it("rejects overlapping windows and windows shorter than a session", () => {
    expect(
      validateWeeklyAvailability(
        [
          { dayOfWeek: 1, startMinute: 540, endMinute: 660, isActive: true },
          { dayOfWeek: 1, startMinute: 600, endMinute: 720, isActive: true },
        ],
        60,
      ),
    ).toEqual(["overlap"]);

    expect(
      validateWeeklyAvailability(
        [{ dayOfWeek: 2, startMinute: 540, endMinute: 570, isActive: true }],
        60,
      ),
    ).toEqual(["tooShort"]);
  });

  it("normalizes inactive days away before saving", () => {
    expect(
      normalizeWeeklyAvailability({
        timezone: DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
        bufferMinutes: 30,
        windows: [
          { dayOfWeek: 2, startMinute: 780, endMinute: 900, isActive: true },
          { dayOfWeek: 3, startMinute: 780, endMinute: 900, isActive: false },
        ],
      }),
    ).toEqual({
      timezone: DEFAULT_MENTOR_TEMPLATE_TIMEZONE,
      bufferMinutes: 30,
      windows: [{ dayOfWeek: 2, startMinute: 780, endMinute: 900, isActive: true }],
    });
  });
});
