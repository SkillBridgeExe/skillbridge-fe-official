import { describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { ApiError } from "@/lib/api-error";
import {
  buildStudioEventProperties,
  captureStudioEvent,
  sanitizeStudioErrorCode,
  studioErrorCode,
} from "./studio-telemetry";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
import posthog from "posthog-js";

describe("studio telemetry", () => {
  it("builds whitelist-only snake_case properties", () => {
    const props = buildStudioEventProperties({
      outcome: "success",
      templateId: "azurill",
      atsMode: true,
      latencyMs: 123.6,
    });
    expect(props).toEqual({
      outcome: "success",
      template_id: "azurill",
      ats_mode: true,
      latency_ms: 124,
    });
  });

  it("cannot leak prose or user content through the error code", () => {
    expect(sanitizeStudioErrorCode("MATCH_TOO_OLD")).toBe("MATCH_TOO_OLD");
    expect(sanitizeStudioErrorCode("http_503")).toBe("http_503");
    // Prose (may quote CV text / emails) collapses to a constant.
    expect(sanitizeStudioErrorCode("Failed to save: contact jane@real-person.com")).toBe("unclassified");
    expect(sanitizeStudioErrorCode("a".repeat(200))).toBe("unclassified");
    const props = buildStudioEventProperties({
      outcome: "failure",
      errorCode: "Server said: Nguyễn Văn A's resume is invalid",
    });
    expect(JSON.stringify(props)).not.toContain("Nguyễn");
  });

  it("derives machine codes from axios/Api errors", () => {
    const axiosErr = new AxiosError("boom", "ERR", undefined, undefined, {
      status: 503,
      statusText: "x",
      headers: {},
      config: {} as never,
      data: {},
    });
    expect(studioErrorCode(axiosErr)).toBe("http_503");
    expect(studioErrorCode(new ApiError("msg", "NO_ANCHOR", null))).toBe("NO_ANCHOR");
    expect(studioErrorCode(new Error("anything"))).toBe("Error");
    expect(studioErrorCode("junk")).toBe("unknown");
  });

  it("captures studio_<operation> events and never throws", () => {
    captureStudioEvent("version_restore", { outcome: "failure", errorCode: "http_500" });
    expect(posthog.capture).toHaveBeenCalledWith("studio_version_restore", {
      outcome: "failure",
      error_code: "http_500",
    });

    vi.mocked(posthog.capture).mockImplementationOnce(() => {
      throw new Error("posthog down");
    });
    expect(() => captureStudioEvent("builder_save", { outcome: "success" })).not.toThrow();
  });
});
