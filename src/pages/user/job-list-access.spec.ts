import { describe, expect, it } from "vitest";
import { getJobListAccess } from "./job-list-access";

describe("getJobListAccess", () => {
  it("allows saved-job data only for an API-authenticated candidate", () => {
    expect(getJobListAccess({ isAuthenticated: true, authSource: "api", role: "user" })).toEqual({
      canQuerySavedJobs: true,
      showSaveAction: true,
    });
  });

  it("keeps business viewers out of candidate saved-job data and controls", () => {
    expect(getJobListAccess({ isAuthenticated: true, authSource: "api", role: "business" })).toEqual({
      canQuerySavedJobs: false,
      showSaveAction: false,
    });
  });

  it("keeps the anonymous save affordance so it can prompt login without fetching data", () => {
    expect(getJobListAccess({ isAuthenticated: false, authSource: null, role: null })).toEqual({
      canQuerySavedJobs: false,
      showSaveAction: true,
    });
  });
});
