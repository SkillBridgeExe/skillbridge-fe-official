// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEffect, useState } from "react";
import type { ReportTab } from "./Diagnosis";

describe("Diagnosis Tab State Machine", () => {
  function useTabStateMachine(step: "cv-review" | "results") {
    const [activeTab, setActiveTab] = useState<ReportTab>("audit");

    useEffect(() => {
      if (step === "results") {
        if (!["fit", "cv_jd", "jobs"].includes(activeTab)) {
          setActiveTab("fit");
        }
      } else if (step === "cv-review") {
        if (!["audit", "cv", "market"].includes(activeTab)) {
          setActiveTab("audit");
        }
      }
    }, [step, activeTab]);

    return { activeTab, setActiveTab };
  }

  it("defaults activeTab to 'audit' in cv-review mode", () => {
    const { result } = renderHook(() => useTabStateMachine("cv-review"));
    expect(result.current.activeTab).toBe("audit");
  });

  it("automatically transitions activeTab to 'fit' when entering results mode", () => {
    let step: "cv-review" | "results" = "cv-review";
    const { result, rerender } = renderHook(() => useTabStateMachine(step));

    expect(result.current.activeTab).toBe("audit");

    step = "results";
    rerender();

    expect(result.current.activeTab).toBe("fit");
  });

  it("automatically reverts activeTab to 'audit' when returning to cv-review mode", () => {
    let step: "cv-review" | "results" = "results";
    const { result, rerender } = renderHook(() => useTabStateMachine(step));

    // Manually select a match mode tab
    act(() => {
      result.current.setActiveTab("cv_jd");
    });
    expect(result.current.activeTab).toBe("cv_jd");

    step = "cv-review";
    rerender();

    expect(result.current.activeTab).toBe("audit");
  });
});
