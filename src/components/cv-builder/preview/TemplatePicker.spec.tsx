// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateThumbnail } from "./TemplatePicker";

describe("TemplateThumbnail", () => {
  it("falls back safely when a legacy builder template id is provided", () => {
    expect(() => render(<TemplateThumbnail template="ats-modern" />)).not.toThrow();
  });
});
