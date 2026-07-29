// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { PricingBenefitList } from "./PricingBenefitList";

describe("PricingBenefitList", () => {
  it("keeps every quota in a dedicated right-aligned column", () => {
    render(
      <PricingBenefitList
        items={[
          { key: "upload", label: "Tải CV", value: "5" },
          {
            key: "recommendations",
            label: "Gợi ý việc làm phù hợp",
            value: "Không giới hạn",
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    for (const quota of screen.getAllByTestId("pricing-benefit-quota")) {
      expect(quota).toHaveClass(
        "justify-self-end",
        "whitespace-nowrap",
        "tabular-nums",
        "w-28",
      );
    }
  });
});
