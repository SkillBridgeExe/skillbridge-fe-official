// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEffect, useState } from "react";
import type { ReportTab } from "./Diagnosis";
import {
  getDiagnosisReportMode,
  normalizeDiagnosisReportTab,
} from "./diagnosis-report-mode";

describe("Diagnosis Tab State Machine", () => {
  function useTabStateMachine(step: "cv-review" | "results", hasJdMatch = false) {
    const [activeTab, setActiveTab] = useState<ReportTab>("audit");

    useEffect(() => {
      const mode = getDiagnosisReportMode(step, hasJdMatch);
      const normalizedTab = normalizeDiagnosisReportTab(mode, activeTab);
      if (normalizedTab !== activeTab) {
        setActiveTab(normalizedTab);
      }
    }, [step, hasJdMatch, activeTab]);

    return { activeTab, setActiveTab };
  }

  it("defaults activeTab to 'audit' in cv-review mode", () => {
    const { result } = renderHook(() => useTabStateMachine("cv-review"));
    expect(result.current.activeTab).toBe("audit");
  });

  it("automatically transitions activeTab to 'fit' when entering CV-JD results mode", () => {
    let step: "cv-review" | "results" = "cv-review";
    const { result, rerender } = renderHook(() => useTabStateMachine(step, true));

    expect(result.current.activeTab).toBe("audit");

    step = "results";
    rerender();

    expect(result.current.activeTab).toBe("fit");
  });

  it("keeps CV-only results in the review tabs", () => {
    let step: "cv-review" | "results" = "cv-review";
    const { result, rerender } = renderHook(() => useTabStateMachine(step, false));

    act(() => {
      result.current.setActiveTab("cv");
    });
    step = "results";
    rerender();

    expect(result.current.activeTab).toBe("cv");
  });

  it("automatically reverts activeTab to 'audit' when returning to cv-review mode", () => {
    let step: "cv-review" | "results" = "results";
    const { result, rerender } = renderHook(() => useTabStateMachine(step, true));

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
