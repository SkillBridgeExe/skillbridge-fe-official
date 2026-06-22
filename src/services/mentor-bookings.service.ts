import {
  cancelBookingApi,
  completeBookingApi,
  createBookingApi,
  getAdminMentorBookingsApi,
  getBookingApi,
  getMentorOwnedBookingsApi,
  getMyBookingsApi,
  mentorCancelBookingApi,
  payRemainingApi,
  reviewBookingApi,
  setMeetingLinkApi,
  updateAdminMentorBookingRefundApi,
  type AdminMentorBookingsQuery,
  type CancelMentorBookingDto,
  type CreateMentorBookingDto,
  type CreateMentorReviewDto,
  type UpdateAdminMentorBookingRefundDto,
  type UpdateMeetingUrlDto,
} from "@/api/mentor-bookings";

export type {
  AdminMentorBookingDto,
  AdminMentorBookingsListDto,
  AdminMentorBookingsQuery,
  AdminRefundResultDto,
  CancelMentorBookingDto,
  CheckoutResponseDto,
  CreateBookingResponse,
  CreateMentorBookingDto,
  CreateMentorReviewDto,
  MentorBookingDto,
  MentorBookingRefundStatus,
  MentorBookingStatus,
  MentorReviewDto,
  UpdateAdminMentorBookingRefundDto,
  UpdateMeetingUrlDto,
} from "@/api/mentor-bookings";

export { MENTOR_BOOKING_STATUSES, MENTOR_BOOKING_REFUND_STATUSES } from "@/api/mentor-bookings";

// Student
export const createBooking = (payload: CreateMentorBookingDto) => createBookingApi(payload);
export const getMyBookings = () => getMyBookingsApi();
export const getBooking = (id: string) => getBookingApi(id);
export const payRemaining = (bookingId: string) => payRemainingApi(bookingId);
export const cancelBooking = (bookingId: string, payload: CancelMentorBookingDto) =>
  cancelBookingApi(bookingId, payload);
export const reviewBooking = (bookingId: string, payload: CreateMentorReviewDto) =>
  reviewBookingApi(bookingId, payload);

// Mentor-owned
export const getMentorOwnedBookings = () => getMentorOwnedBookingsApi();
export const setMeetingLink = (bookingId: string, payload: UpdateMeetingUrlDto) =>
  setMeetingLinkApi(bookingId, payload);
export const completeBooking = (bookingId: string) => completeBookingApi(bookingId);
export const mentorCancelBooking = (bookingId: string, payload: CancelMentorBookingDto) =>
  mentorCancelBookingApi(bookingId, payload);

// Admin
export const getAdminMentorBookings = (query: AdminMentorBookingsQuery = {}) =>
  getAdminMentorBookingsApi(query);
export const updateAdminMentorBookingRefund = (
  bookingId: string,
  payload: UpdateAdminMentorBookingRefundDto,
) => updateAdminMentorBookingRefundApi(bookingId, payload);
