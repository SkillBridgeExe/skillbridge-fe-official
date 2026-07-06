import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import {
  createBookingApi,
  getAdminMentorBookingsApi,
  payBookingApi,
} from "./mentor-bookings";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => vi.clearAllMocks());

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("mentor booking api routes", () => {
  it("creates bookings with the required student goal", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(
      ok({
        booking: { id: "booking-1", studentGoal: "Review my backend architecture." },
        checkout: { orderCode: 101 },
      }) as never,
    );

    await createBookingApi({
      mentorProfileId: "profile-1",
      slotId: "slot-1",
      studentGoal: "Review my backend architecture.",
    });

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.MENTOR_BOOKINGS.CREATE, {
      mentorProfileId: "profile-1",
      slotId: "slot-1",
      studentGoal: "Review my backend architecture.",
    });
  });

  it("maps payment retries to the full mentor booking payment route", async () => {
    vi.mocked(httpClient.post).mockReturnValueOnce(ok({ orderCode: 101 }) as never);

    await payBookingApi("booking-1");

    expect(httpClient.post).toHaveBeenCalledWith(API_ROUTES.MENTOR_BOOKINGS.PAY("booking-1"));
  });

  it("passes refund status filters through to admin mentor booking search", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({ page: 1, limit: 20, total: 0, items: [] }) as never,
    );

    await getAdminMentorBookingsApi({ refundStatus: "PENDING", page: 1 });

    expect(httpClient.get).toHaveBeenCalledWith(API_ROUTES.ADMIN_BILLING.MENTOR_BOOKINGS, {
      params: { refundStatus: "PENDING", page: 1 },
    });
  });
});
