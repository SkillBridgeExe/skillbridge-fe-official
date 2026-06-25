// ─── Business company hooks (TanStack Query) ───────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBusinessCompanyApi, updateBusinessCompanyApi,
  sendWorkEmailVerificationApi, verifyWorkEmailApi,
  uploadCompanyMediaApi, submitBusinessProfileApi,
  downloadCompanyMediaApi,
} from "@/api/business-company";
import type { UpdateBusinessCompanyRequest } from "@/types/jobs";

const keys = {
  company: ["businessCompany"] as const,
};

export function useBusinessCompanyQuery() {
  return useQuery({
    queryKey: keys.company,
    queryFn: getBusinessCompanyApi,
  });
}

export function useUpdateBusinessCompanyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBusinessCompanyRequest) => updateBusinessCompanyApi(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.company });
      qc.invalidateQueries({ queryKey: ["businessCompanyMedia"] });
    },
  });
}

export function useSendWorkEmailVerificationMutation() {
  return useMutation({
    mutationFn: () => sendWorkEmailVerificationApi(),
  });
}

export function useVerifyWorkEmailMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => verifyWorkEmailApi(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.company });
      qc.invalidateQueries({ queryKey: ["businessCompanyMedia"] });
    },
  });
}

export function useUploadCompanyMediaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, file }: { kind: "logo" | "cover"; file: File }) =>
      uploadCompanyMediaApi(kind, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.company });
      qc.invalidateQueries({ queryKey: ["businessCompanyMedia"] });
    },
  });
}

export function useBusinessCompanyMediaQuery(kind: "logo" | "cover", enabled: boolean) {
  return useQuery({
    queryKey: ["businessCompanyMedia", kind],
    queryFn: () => downloadCompanyMediaApi(kind),
    enabled,
  });
}

export function useSubmitBusinessProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => submitBusinessProfileApi(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.company });
    },
  });
}
