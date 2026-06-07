import { useMutation } from "@tanstack/react-query";
import {
  analyzeCv,
  analyzeCvWithJd,
  compareJdForCv,
  reanalyzeCv,
} from "@/services/diagnosis.service";

/** Chấm CV (không JD) — POST /api/cvs thật, trả { cvId, review }. */
export function useAnalyzeCvMutation() {
  return useMutation({
    mutationFn: analyzeCv,
  });
}

/** Chấm CV + so JD — upload/chấm rồi match cvId × jdText (2 call tuần tự). */
export function useAnalyzeCvWithJdMutation() {
  return useMutation({
    mutationFn: analyzeCvWithJd,
  });
}

/** So CV ĐÃ chấm (lastCvId) với JD — chỉ 1 call match, không upload lại. */
export function useCompareJdMutation() {
  return useMutation({
    mutationFn: compareJdForCv,
  });
}

/** "Phân tích lại" CV đã có trên BE theo cvId — tốn 1 lượt quota chấm, không upload lại. */
export function useReanalyzeCvMutation() {
  return useMutation({
    mutationFn: reanalyzeCv,
  });
}
