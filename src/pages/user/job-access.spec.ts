import { describe, expect, it } from "vitest";
import { getExternalJobApplyUrl } from "./job-access";

describe("getExternalJobApplyUrl", () => {
  it.each(["javascript:alert(1)", "data:text/html,unsafe", "ftp://example.com/job"])(
    "rejects non-http URLs (%s)",
    (sourceUrl) => {
      expect(getExternalJobApplyUrl({ isAuthenticated: false, role: null }, sourceUrl)).toBeNull();
    },
  );

  it("allows a valid HTTPS URL for anonymous visitors and candidates", () => {
    expect(getExternalJobApplyUrl({ isAuthenticated: false, role: null }, "https://careers.example.com/job")).toBe("https://careers.example.com/job");
    expect(getExternalJobApplyUrl({ isAuthenticated: true, role: "user" }, "https://careers.example.com/job")).toBe("https://careers.example.com/job");
  });

  it.each(["business", "mentor", "admin"] as const)("hides external apply from %s viewers", (role) => {
    expect(getExternalJobApplyUrl({ isAuthenticated: true, role }, "https://careers.example.com/job")).toBeNull();
  });
});
