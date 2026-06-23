// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ElementIssueSkill } from "./ElementIssueSkill";
import type { ElementIssue } from "./element-issues";

// i18n: echo the key + interpolate `index`/`total` so we can assert which
// branch (verbatim BE why vs i18n whyKey) rendered, plus the 1-of-N footer.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === "companion.elementIssue.oneOfN" ? `${opts?.index} of ${opts?.total}` : key,
  }),
}));

afterEach(cleanup);

const baseIssue: ElementIssue = {
  id: "evidence:react",
  kind: "listed_no_evidence",
  anchorId: "evidence-react",
  severity: 3,
  whatKey: "companion.elementIssue.listed_no_evidence.what",
  why: null,
  whyKey: "companion.elementIssue.listed_no_evidence.why",
  ctaKind: "rewrite",
};

describe("ElementIssueSkill", () => {
  it("renders the BE-authored why VERBATIM when issue.why is present", () => {
    const issue: ElementIssue = { ...baseIssue, why: "Bạn liệt kê React nhưng chưa có ví dụ.", whyKey: null };
    render(<ElementIssueSkill issue={issue} index={0} total={3} onCta={() => {}} onDismiss={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText("Bạn liệt kê React nhưng chưa có ví dụ.")).toBeInTheDocument();
    // the i18n whyKey must NOT be used when a verbatim why exists
    expect(screen.queryByText("companion.elementIssue.listed_no_evidence.why")).not.toBeInTheDocument();
  });

  it("falls back to the i18n whyKey when issue.why is null", () => {
    render(<ElementIssueSkill issue={baseIssue} index={0} total={3} onCta={() => {}} onDismiss={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText("companion.elementIssue.listed_no_evidence.why")).toBeInTheDocument();
  });

  it("renders the '1 of N' footer", () => {
    render(<ElementIssueSkill issue={baseIssue} index={0} total={3} onCta={() => {}} onDismiss={() => {}} onSnooze={() => {}} />);
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("renders a CTA keyed off ctaKind, and fires onCta", () => {
    const onCta = vi.fn();
    render(<ElementIssueSkill issue={baseIssue} index={0} total={3} onCta={onCta} onDismiss={() => {}} onSnooze={() => {}} />);
    const cta = screen.getByText("companion.elementIssue.cta.rewrite");
    fireEvent.click(cta);
    expect(onCta).toHaveBeenCalledOnce();
  });

  it("the why-first popover lists ONLY present factors (honest)", () => {
    const issue: ElementIssue = { ...baseIssue, severityFactors: { market_demand: 42 } };
    render(<ElementIssueSkill issue={issue} index={0} total={1} onCta={() => {}} onDismiss={() => {}} onSnooze={() => {}} />);
    fireEvent.click(screen.getByText("companion.elementIssue.whyFirst"));
    expect(screen.getByText("companion.elementIssue.factor.market_demand")).toBeInTheDocument();
    // absent factors must NOT appear
    expect(screen.queryByText("companion.elementIssue.factor.evidence_risk")).not.toBeInTheDocument();
    expect(screen.queryByText("companion.elementIssue.factor.interview_risk")).not.toBeInTheDocument();
  });

  it("does not show the why-first affordance when there are no factors", () => {
    render(<ElementIssueSkill issue={baseIssue} index={0} total={1} onCta={() => {}} onDismiss={() => {}} onSnooze={() => {}} />);
    expect(screen.queryByText("companion.elementIssue.whyFirst")).not.toBeInTheDocument();
  });

  it("dismiss menu fires onDismiss (once) and onSnooze", () => {
    const onDismiss = vi.fn();
    const onSnooze = vi.fn();
    render(<ElementIssueSkill issue={baseIssue} index={0} total={1} onCta={() => {}} onDismiss={onDismiss} onSnooze={onSnooze} />);
    fireEvent.click(screen.getByText("companion.elementIssue.dismiss"));
    fireEvent.click(screen.getByText("companion.elementIssue.dismissOnce"));
    expect(onDismiss).toHaveBeenCalledOnce();
    // re-open + snooze
    fireEvent.click(screen.getByText("companion.elementIssue.dismiss"));
    fireEvent.click(screen.getByText("companion.elementIssue.snooze"));
    expect(onSnooze).toHaveBeenCalledOnce();
  });
});
