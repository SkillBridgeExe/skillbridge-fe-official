import { describe, expect, it } from "vitest";

import {
  buildCvUploadedEventProperties,
  createCvUploadId,
  getCvUploadScanProperties,
} from "./cv-analytics";

describe("cv analytics", () => {
  it("builds cv_uploaded properties without leaking file names or CV content", () => {
    const properties = buildCvUploadedEventProperties({
      cvUploadId: "cvu_test_123",
      file: { name: "nguyen-van-a-secret-cv.pdf", size: 512 * 1024 },
      inputMethod: "file_picker",
      targetRole: "frontend_developer",
      jobDescription: "React developer role",
      consentAccepted: true,
    });

    expect(properties).toEqual({
      cv_upload_id: "cvu_test_123",
      cv_source: "upload",
      input_method: "file_picker",
      file_extension: "pdf",
      file_size_bucket: "under_1mb",
      has_target_role: true,
      target_role: "frontend_developer",
      has_jd_text: true,
      consent_accepted: true,
    });
    expect(JSON.stringify(properties)).not.toContain("nguyen-van-a-secret-cv");
    expect(JSON.stringify(properties)).not.toContain("React developer role");
  });

  it("normalizes extension, file size bucket, and empty optional fields", () => {
    const properties = buildCvUploadedEventProperties({
      cvUploadId: "cvu_test_456",
      file: { name: "portfolio.final.WEBP", size: 4 * 1024 * 1024 },
      inputMethod: "drag_drop",
      targetRole: null,
      jobDescription: "   ",
      consentAccepted: false,
    });

    expect(properties.file_extension).toBe("webp");
    expect(properties.file_size_bucket).toBe("3_5mb");
    expect(properties.has_target_role).toBe(false);
    expect(properties.target_role).toBe("none");
    expect(properties.has_jd_text).toBe(false);
    expect(properties.consent_accepted).toBe(false);
  });

  it("creates upload ids and reuses them for upload-sourced scan events", () => {
    const cvUploadId = createCvUploadId();

    expect(cvUploadId).toMatch(/^cvu_/);
    expect(getCvUploadScanProperties("upload", cvUploadId)).toEqual({
      cv_upload_id: cvUploadId,
    });
    expect(getCvUploadScanProperties("builder", cvUploadId)).toEqual({});
    expect(getCvUploadScanProperties("upload", null)).toEqual({});
  });
});
