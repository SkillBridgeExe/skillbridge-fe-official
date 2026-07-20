import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { useJobApplicationCvs } from "./use-job-application-cvs";

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn((options) => options) }));
vi.mock("@/api/cv/list", () => ({ getCvListApi: vi.fn() }));

describe("useJobApplicationCvs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only requests the real CV list for an eligible candidate", () => {
    useJobApplicationCvs("candidate-1", true);
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ["jobApplicationCvs", "candidate-1"],
      enabled: true,
    }));
  });

  it("leaves personal CV data disabled for non-candidate viewers", () => {
    useJobApplicationCvs(null, false);
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("partitions cached CV choices when the signed-in account changes", () => {
    useJobApplicationCvs("candidate-1", true);
    useJobApplicationCvs("candidate-2", true);

    expect(useQuery).toHaveBeenNthCalledWith(1, expect.objectContaining({
      queryKey: ["jobApplicationCvs", "candidate-1"],
    }));
    expect(useQuery).toHaveBeenNthCalledWith(2, expect.objectContaining({
      queryKey: ["jobApplicationCvs", "candidate-2"],
    }));
  });
});
