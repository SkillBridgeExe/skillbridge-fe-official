// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FieldNudge } from "./FieldNudge";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe("FieldNudge", () => {
  it("renders nothing when count is 0 (strong line → no nudge)", () => {
    const { container } = render(<FieldNudge count={0} onClick={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the hint with the count and fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(<FieldNudge count={3} onClick={onClick} />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("3");
    expect(btn).toHaveTextContent("companion.nudgeSuggestions");

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
