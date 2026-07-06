import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

// ── Status enums ───────────────────────────────────────────────────────────

export const MENTOR_BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "PENDING_DEPOSIT",
  "AWAITING_REMAINING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type MentorBookingStatus = (typeof MENTOR_BOOKING_STATUSES)[number];

export const MENTOR_BOOKING_REFUND_STATUSES = [
  "NOT_REQUIRED",
  "PENDING",
  "PROCESSED",
  "REJECTED",
] as const;
export type MentorBookingRefundStatus = (typeof MENTOR_BOOKING_REFUND_STATUSES)[number];

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface MentorBookingDto {
  id: string;
  studentId: string;
  mentorProfileId: string;
  availabilitySlotId: string;
  status: MentorBookingStatus;
  studentGoal: string | null;
  package: {
    mentorProfileId: string;
    mentorSlug: string;
    headline: string | null;
    sessionPriceVnd: number;
    sessionDurationMinutes: number;
    currency: "VND";
  } | null;
  slotStart: string | null;
  slotEnd: string | null;
  totalAmountVnd: number;
  paymentOrderId: string | null;
  depositAmountVnd: number;
  remainingAmountVnd: number;
  remainingDueAt: string | null;
  meetingUrl: string | null;
  refundStatus: MentorBookingRefundStatus;
  cancellationReason: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CheckoutResponseDto {
  orderId: string;
  orderCode: number;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "FAILED";
  checkoutUrl: string | null;
  qrCode: string | null;
  paymentLinkId: string | null;
  expiresAt: string | null;
}

export interface CreateMentorBookingDto {
  mentorProfileId: string;
  slotId: string;
  studentGoal: string;
}

export interface CreateBookingResponse {
  booking: MentorBookingDto;
  checkout: CheckoutResponseDto;
}

export interface CancelMentorBookingDto {
  reason: string;
}

export interface CreateMentorReviewDto {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface MentorReviewDto {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface UpdateMeetingUrlDto {
  meetingUrl: string;
}

// Admin-specific extended booking DTO
export interface AdminMentorBookingDto extends MentorBookingDto {
  mentorId: string;
  planCode: string | null;
  paymentOrderId: string | null;
  depositPaymentOrderId: string | null;
  remainingPaymentOrderId: string | null;
  acceptedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  refundNote: string | null;
}

export interface AdminMentorBookingsListDto {
  page: number;
  limit: number;
  total: number;
  items: AdminMentorBookingDto[];
}

export interface AdminMentorBookingsQuery {
  page?: number;
  limit?: number;
  status?: MentorBookingStatus;
  refundStatus?: MentorBookingRefundStatus;
  studentId?: string;
  mentorId?: string;
}

export interface UpdateAdminMentorBookingRefundDto {
  status: "PROCESSED" | "REJECTED";
  note: string;
}

export interface AdminRefundResultDto {
  id: string;
  status: MentorBookingStatus;
  refundStatus: "PROCESSED" | "REJECTED";
  refundNote: string;
  updatedAt: string | null;
}

// ── Student booking APIs ───────────────────────────────────────────────────

export async function createBookingApi(
  payload: CreateMentorBookingDto,
): Promise<CreateBookingResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CreateBookingResponse>>(
    httpClient.post(API_ROUTES.MENTOR_BOOKINGS.CREATE, payload),
    "Failed to create booking.",
  );
  return envelope.data;
}

export async function getMyBookingsApi(): Promise<MentorBookingDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorBookingDto[]>>(
    httpClient.get(API_ROUTES.MENTOR_BOOKINGS.MY_LIST),
    "Failed to load your bookings.",
  );
  return envelope.data;
}

export async function getBookingApi(
  bookingId: string,
): Promise<MentorBookingDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorBookingDto>>(
    httpClient.get(API_ROUTES.MENTOR_BOOKINGS.DETAIL(bookingId)),
    "Failed to load booking details.",
  );
  return envelope.data;
}

export async function payBookingApi(
  bookingId: string,
): Promise<CheckoutResponseDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<CheckoutResponseDto>>(
    httpClient.post(API_ROUTES.MENTOR_BOOKINGS.PAY(bookingId)),
    "Failed to create mentor booking payment.",
  );
  return envelope.data;
}

export async function cancelBookingApi(
  bookingId: string,
  payload: CancelMentorBookingDto,
): Promise<MentorBookingDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorBookingDto>>(
    httpClient.post(API_ROUTES.MENTOR_BOOKINGS.CANCEL(bookingId), payload),
    "Failed to cancel booking.",
  );
  return envelope.data;
}

export async function reviewBookingApi(
  bookingId: string,
  payload: CreateMentorReviewDto,
): Promise<MentorReviewDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorReviewDto>>(
    httpClient.post(API_ROUTES.MENTOR_BOOKINGS.REVIEW(bookingId), payload),
    "Failed to submit review.",
  );
  return envelope.data;
}

// ── Mentor-owned booking management APIs ───────────────────────────────────

export async function getMentorOwnedBookingsApi(): Promise<MentorBookingDto[]> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorBookingDto[]>>(
    httpClient.get(API_ROUTES.MENTORS.MY_BOOKINGS),
    "Failed to load your mentor bookings.",
  );
  return envelope.data;
}

export async function setMeetingLinkApi(
  bookingId: string,
  payload: UpdateMeetingUrlDto,
): Promise<MentorBookingDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorBookingDto>>(
    httpClient.patch(API_ROUTES.MENTORS.MY_BOOKING_MEETING_LINK(bookingId), payload),
    "Failed to update meeting link.",
  );
  return envelope.data;
}

export async function completeBookingApi(
  bookingId: string,
): Promise<MentorBookingDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorBookingDto>>(
    httpClient.post(API_ROUTES.MENTORS.MY_BOOKING_COMPLETE(bookingId)),
    "Failed to complete booking.",
  );
  return envelope.data;
}

export async function mentorCancelBookingApi(
  bookingId: string,
  payload: CancelMentorBookingDto,
): Promise<MentorBookingDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<MentorBookingDto>>(
    httpClient.post(API_ROUTES.MENTORS.MY_BOOKING_CANCEL(bookingId), payload),
    "Failed to cancel booking.",
  );
  return envelope.data;
}

// ── Admin mentor booking APIs ──────────────────────────────────────────────

export async function getAdminMentorBookingsApi(
  query: AdminMentorBookingsQuery = {},
): Promise<AdminMentorBookingsListDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminMentorBookingsListDto>>(
    httpClient.get(API_ROUTES.ADMIN_BILLING.MENTOR_BOOKINGS, { params: query }),
    "Failed to load admin mentor bookings.",
  );
  return envelope.data;
}

export async function updateAdminMentorBookingRefundApi(
  bookingId: string,
  payload: UpdateAdminMentorBookingRefundDto,
): Promise<AdminRefundResultDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<AdminRefundResultDto>>(
    httpClient.patch(API_ROUTES.ADMIN_BILLING.MENTOR_BOOKING_REFUND(bookingId), payload),
    "Failed to update refund status.",
  );
  return envelope.data;
}
