// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const createResumePdfBlobMock = vi.hoisted(() => vi.fn());

vi.mock("@resume-engine/pdf/browser", () => ({
  createResumePdfBlob: createResumePdfBlobMock,
}));

import { TemplateGallery } from "./TemplatePicker";

describe("TemplateGallery", () => {
  it("does not call createResumePdfBlob when rendering the gallery (prevents OOM/lag)", () => {
    const { container } = render(<TemplateGallery />);
    
    // Ensure the gallery renders the thumbnails as images
    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    
    // But it should NEVER call the heavy PDF renderer for the gallery itself
    expect(createResumePdfBlobMock).not.toHaveBeenCalled();
  });
});
