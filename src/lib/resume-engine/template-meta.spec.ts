import { describe, it, expect } from "vitest";
import { templateSchema } from "./schema/templates";
import { getTemplateCapabilities, TEMPLATE_PREVIEWS } from "./template-meta";

describe("Template Metadata", () => {
  it("should have a preview definition for every valid template", () => {
    const templates = templateSchema.options;
    
    for (const template of templates) {
      expect(TEMPLATE_PREVIEWS[template]).toBeDefined();
    }
  });

  it("should return capabilities for every template", () => {
    const templates = templateSchema.options;
    
    for (const template of templates) {
      const caps = getTemplateCapabilities(template);
      expect(caps).toBeDefined();
      expect(typeof caps.supportsAvatar).toBe("boolean");
      expect(typeof caps.supportsTwoColumn).toBe("boolean");
      expect(typeof caps.supportsSidebar).toBe("boolean");
      expect(typeof caps.supportsTypography).toBe("boolean");
      expect(typeof caps.supportsAccentColor).toBe("boolean");
      expect(typeof caps.supportsSpacing).toBe("boolean");
      expect(typeof caps.supportsDenseMode).toBe("boolean");
      expect(typeof caps.supportsCustomSectionOrder).toBe("boolean");
    }
  });

  it("does not advertise unsupported controls for minimal no-photo templates", () => {
    const caps = getTemplateCapabilities("onyx");

    expect(caps.supportsAvatar).toBe(false);
    expect(caps.supportsSidebar).toBe(false);
    expect(caps.supportsTwoColumn).toBe(false);
  });

  it("marks split and sidebar templates as two-column capable", () => {
    expect(getTemplateCapabilities("azurill").supportsTwoColumn).toBe(true);
    expect(getTemplateCapabilities("gengar").supportsTwoColumn).toBe(true);
    expect(getTemplateCapabilities("onyx").supportsTwoColumn).toBe(false);
  });
});
