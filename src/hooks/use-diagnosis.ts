import { useMutation } from "@tanstack/react-query";
import { reviewCv } from "@/api/diagnosis-api";

export function useReviewCvMutation() {
  return useMutation({
    mutationFn: reviewCv,
  });
}
