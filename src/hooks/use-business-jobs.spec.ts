import { describe, expect, it } from "vitest";
import type { BusinessJobDetailResponse, JobVersionDto } from "@/types/jobs";
import { withStalePublishReadiness } from "./use-business-jobs";

const draft = { id: "draft", revision: 8 } as JobVersionDto;
const detail = {
  job: {},
  draft: null,
  published: null,
  publishReadiness: { ready: true, blockers: [] },
} as unknown as BusinessJobDetailResponse;

describe("business job detail cache", () => {
  it("never carries publish readiness across a draft revision", () => {
    expect(withStalePublishReadiness(detail, draft)).toMatchObject({
      draft,
      publishReadiness: {
        ready: false,
        blockers: [{ code: "READINESS_STALE", field: "review" }],
      },
    });
  });
});
