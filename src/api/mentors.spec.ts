import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  blockMentorSlotApi,
  getMyMentorAvailabilityTemplateApi,
  saveMyMentorAvailabilityTemplateApi,
  unblockMentorSlotApi,
} from "./mentors";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("mentor availability api routes", () => {
  it("loads and saves the weekly availability template through the mentor-owned route", async () => {
    const response = {
      timezone: "Asia/Ho_Chi_Minh",
      bufferMinutes: 15,
      windows: [{ id: "template-1", dayOfWeek: 1, startMinute: 540, endMinute: 720, isActive: true }],
    };
    vi.mocked(httpClient.get).mockReturnValueOnce(ok(response) as never);
    vi.mocked(httpClient.put).mockReturnValueOnce(ok(response) as never);

    await getMyMentorAvailabilityTemplateApi();
    await saveMyMentorAvailabilityTemplateApi({
      timezone: "Asia/Ho_Chi_Minh",
      bufferMinutes: 15,
      windows: [{ dayOfWeek: 1, startMinute: 540, endMinute: 720, isActive: true }],
    });

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.MENTORS.MY_AVAILABILITY_TEMPLATE);
    expect(httpClient.put).toHaveBeenCalledWith(API_ROUTES.MENTORS.MY_AVAILABILITY_TEMPLATE, {
      timezone: "Asia/Ho_Chi_Minh",
      bufferMinutes: 15,
      windows: [{ dayOfWeek: 1, startMinute: 540, endMinute: 720, isActive: true }],
    });
  });

  it("uses explicit generated slot block and unblock routes", async () => {
    vi.mocked(httpClient.post)
      .mockReturnValueOnce(ok({ id: "slot-1", source: "TEMPLATE", status: "BLOCKED" }) as never)
      .mockReturnValueOnce(ok({ id: "slot-1", source: "TEMPLATE", status: "OPEN" }) as never);

    await blockMentorSlotApi("slot-1");
    await unblockMentorSlotApi("slot-1");

    expect(httpClient.post).toHaveBeenNthCalledWith(1, API_ROUTES.MENTORS.MY_SLOT_BLOCK("slot-1"));
    expect(httpClient.post).toHaveBeenNthCalledWith(2, API_ROUTES.MENTORS.MY_SLOT_UNBLOCK("slot-1"));
  });
});
