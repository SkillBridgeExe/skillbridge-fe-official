import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import {
  cancelBooking,
  completeBooking,
  createBooking,
  getAdminMentorBookings,
  getBooking,
  getMentorOwnedBookings,
  getMyBookings,
  mentorCancelBooking,
  payRemaining,
  reviewBooking,
  setMeetingLink,
  updateAdminMentorBookingRefund,
  type AdminMentorBookingsQuery,
  type CancelMentorBookingDto,
  type CreateMentorBookingDto,
  type CreateMentorReviewDto,
  type UpdateAdminMentorBookingRefundDto,
  type UpdateMeetingUrlDto,
} from "@/services/mentor-bookings.service";

// ── Student booking hooks ──────────────────────────────────────────────────

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMentorBookingDto) => createBooking(payload),
    onSuccess: () => {
      void invalidateBookingCaches(queryClient);
    },
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_MENTOR_BOOKINGS,
    queryFn: getMyBookings,
  });
}

export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.MENTOR_BOOKING(bookingId ?? ""),
    queryFn: () => getBooking(bookingId!),
    enabled: Boolean(bookingId),
  });
}

export function usePayRemaining() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => payRemaining(bookingId),
    onSuccess: () => {
      void invalidateBookingCaches(queryClient);
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: CancelMentorBookingDto;
    }) => cancelBooking(bookingId, payload),
    onSuccess: () => {
      void invalidateBookingCaches(queryClient);
    },
  });
}

export function useReviewBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: CreateMentorReviewDto;
    }) => reviewBooking(bookingId, payload),
    onSuccess: () => {
      void invalidateBookingCaches(queryClient);
    },
  });
}

// ── Mentor-owned booking hooks ─────────────────────────────────────────────

export function useMentorOwnedBookings() {
  return useQuery({
    queryKey: QUERY_KEYS.MENTOR_OWNED_BOOKINGS,
    queryFn: getMentorOwnedBookings,
  });
}

export function useSetMeetingLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: UpdateMeetingUrlDto;
    }) => setMeetingLink(bookingId, payload),
    onSuccess: () => {
      void invalidateBookingCaches(queryClient);
    },
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => completeBooking(bookingId),
    onSuccess: () => {
      void invalidateBookingCaches(queryClient);
    },
  });
}

export function useMentorCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: CancelMentorBookingDto;
    }) => mentorCancelBooking(bookingId, payload),
    onSuccess: () => {
      void invalidateBookingCaches(queryClient);
    },
  });
}

// ── Admin mentor booking hooks ─────────────────────────────────────────────

export function useAdminMentorBookings(query: AdminMentorBookingsQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_MENTOR_BOOKINGS(query),
    queryFn: () => getAdminMentorBookings(query),
  });
}

export function useAdminMentorBookingRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: UpdateAdminMentorBookingRefundDto;
    }) => updateAdminMentorBookingRefund(bookingId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "billing", "mentor-bookings"] });
      void invalidateBookingCaches(queryClient);
    },
  });
}

// ── Shared invalidation ────────────────────────────────────────────────────

function invalidateBookingCaches(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["mentor-bookings"] }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MENTOR_OWNED_BOOKINGS }),
    queryClient.invalidateQueries({ queryKey: ["mentors", "slots"] }),
    queryClient.invalidateQueries({ queryKey: ["mentor", "me", "slots"] }),
    queryClient.invalidateQueries({ queryKey: ["billing", "order"] }),
  ]);
}
