export type CvUploadInputMethod = "file_picker" | "drag_drop";
export type CvAnalyticsSource = "upload" | "builder" | "existing_review";
export type CvFileSizeBucket = "under_1mb" | "1_3mb" | "3_5mb" | "over_5mb";

type CvAnalyticsFile = Pick<File, "name" | "size">;

export interface CvUploadedEventInput {
  cvUploadId: string;
  file: CvAnalyticsFile;
  inputMethod: CvUploadInputMethod;
  targetRole: string | null;
  jobDescription: string;
  consentAccepted: boolean;
}

export interface CvUploadedEventProperties {
  cv_upload_id: string;
  cv_source: "upload";
  input_method: CvUploadInputMethod;
  file_extension: string;
  file_size_bucket: CvFileSizeBucket;
  has_target_role: boolean;
  target_role: string;
  has_jd_text: boolean;
  consent_accepted: boolean;
}

export function createCvUploadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `cvu_${crypto.randomUUID()}`;
  }

  return `cvu_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getCvFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");

  if (dotIndex < 0 || dotIndex === normalized.length - 1) return "unknown";

  return normalized.slice(dotIndex + 1);
}

function getCvFileSizeBucket(sizeBytes: number): CvFileSizeBucket {
  const oneMb = 1024 * 1024;

  if (sizeBytes < oneMb) return "under_1mb";
  if (sizeBytes < 3 * oneMb) return "1_3mb";
  if (sizeBytes <= 5 * oneMb) return "3_5mb";
  return "over_5mb";
}

export function buildCvUploadedEventProperties({
  cvUploadId,
  file,
  inputMethod,
  targetRole,
  jobDescription,
  consentAccepted,
}: CvUploadedEventInput): CvUploadedEventProperties {
  const normalizedTargetRole = targetRole?.trim();

  return {
    cv_upload_id: cvUploadId,
    cv_source: "upload",
    input_method: inputMethod,
    file_extension: getCvFileExtension(file.name),
    file_size_bucket: getCvFileSizeBucket(file.size),
    has_target_role: Boolean(normalizedTargetRole),
    target_role: normalizedTargetRole || "none",
    has_jd_text: jobDescription.trim().length > 0,
    consent_accepted: consentAccepted,
  };
}

export function getCvUploadScanProperties(
  cvSource: CvAnalyticsSource,
  cvUploadId: string | null,
): { cv_upload_id?: string } {
  if (cvSource !== "upload" || !cvUploadId) return {};

  return { cv_upload_id: cvUploadId };
}
