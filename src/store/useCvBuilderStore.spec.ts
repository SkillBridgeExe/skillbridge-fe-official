import { describe, expect, it } from "vitest";
import { useCvBuilderStore } from "./useCvBuilderStore";
import type { CanonicalCvDocument } from "@shared/api";

describe("useCvBuilderStore.hydrateFromCanonical", () => {
  it("hydrates contact, projects, and project links from a canonical CV", () => {
    const doc: CanonicalCvDocument = {
      language: "en",
      contact: {
        name: "Anonymized Candidate",
        email: "candidate@example.com",
        phone: "0912.345.678",
        location: "Thu Duc, Ho Chi Minh City",
        links: [
          { label: "LinkedIn", url: "https://linkedin.com/in/candidate" },
          { label: "GitHub", url: "https://github.com/candidate" },
        ],
      },
      summary: "Backend developer.",
      education: [],
      experience: [],
      projects: [
        {
          name: "Gender HealthCare Service Management System",
          role: "Backend Developer",
          tech: ["ASP.NET Core", "SQL Server"],
          bullets: ["Designed RESTful APIs.", "Secured endpoints with JWT."],
          link: "https://github.com/example/gender-healthcare",
        },
      ],
      skills: { technical: ["C#"], soft: [], languages: ["English"], tools: ["Docker"] },
      certifications: [],
      activities: [],
    };

    useCvBuilderStore.getState().hydrateFromCanonical(doc);
    const state = useCvBuilderStore.getState();

    expect(state.fullName).toBe("Anonymized Candidate");
    expect(state.email).toBe("candidate@example.com");
    expect(state.phone).toBe("0912.345.678");
    expect(state.location).toBe("Thu Duc, Ho Chi Minh City");
    expect(state.projects[0]).toMatchObject({
      name: "Gender HealthCare Service Management System",
      role: "Backend Developer",
      tools: "ASP.NET Core, SQL Server",
      description: "Designed RESTful APIs.\nSecured endpoints with JWT.",
      link: "https://github.com/example/gender-healthcare",
    });
  });

  it("preserveDraft keeps the active draft session (draftId) while the default resets it", () => {
    const doc: CanonicalCvDocument = {
      language: "en",
      contact: { name: null, email: null, phone: null, location: null, links: [] },
      summary: "",
      education: [],
      experience: [],
      projects: [],
      skills: { technical: [], soft: [], languages: [], tools: [] },
      certifications: [],
      activities: [],
    };

    // Default (fresh Diagnosis seed) resets the draft.
    useCvBuilderStore.setState({ draftId: "draft-1" });
    useCvBuilderStore.getState().hydrateFromCanonical(doc);
    expect(useCvBuilderStore.getState().draftId).toBeNull();

    // Story apply into an active draft must NOT null draftId (else the builder breaks post-apply).
    useCvBuilderStore.setState({ draftId: "draft-2" });
    useCvBuilderStore.getState().hydrateFromCanonical(doc, { preserveDraft: true });
    expect(useCvBuilderStore.getState().draftId).toBe("draft-2");
  });

  it("tracks the source CV separately until the server draft is created", () => {
    useCvBuilderStore.getState().setSeedSourceCvId("uploaded-cv-1");

    expect(useCvBuilderStore.getState().seedSourceCvId).toBe("uploaded-cv-1");

    useCvBuilderStore.getState().reset();
    expect(useCvBuilderStore.getState().seedSourceCvId).toBeNull();
  });
});

describe("useCvBuilderStore.pendingProveIt", () => {
  it("stores and clears the pending prove-it target", () => {
    useCvBuilderStore.getState().setPendingProveIt({ canonical: "react", displayName: "React" });

    expect(useCvBuilderStore.getState().pendingProveIt).toEqual({ canonical: "react", displayName: "React" });

    useCvBuilderStore.getState().setPendingProveIt(null);
    expect(useCvBuilderStore.getState().pendingProveIt).toBeNull();
  });

  it("clears pending prove-it on reset", () => {
    useCvBuilderStore.getState().setPendingProveIt({ canonical: "react", displayName: "React" });

    useCvBuilderStore.getState().reset();

    expect(useCvBuilderStore.getState().pendingProveIt).toBeNull();
  });
});

describe("useCvBuilderStore.importState", () => {
  it("imports serializable resume data while preserving the active draft session", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().setDraftId("draft-1");
    useCvBuilderStore.getState().setSectionEvaluation("summary", {
      score: 60,
      label: "Needs improvement",
      checklist: [],
      missing: ["Add more evidence"],
    });

    useCvBuilderStore.getState().importState({
      fullName: "Imported Candidate",
      photoUrl: "https://example.com/photo.jpg",
      profileLinks: [{ id: "profile-1", network: "GitHub", url: "https://github.com/imported", visible: true }],
      languageDetails: [{ id: "lang-1", name: "English", proficiency: "Professional" }],
    });

    expect(useCvBuilderStore.getState()).toMatchObject({
      draftId: "draft-1",
      fullName: "Imported Candidate",
      photoUrl: "https://example.com/photo.jpg",
      profileLinks: [{ id: "profile-1", network: "GitHub", url: "https://github.com/imported", visible: true }],
      languageDetails: [{ id: "lang-1", name: "English", proficiency: "Professional" }],
      sectionEvaluations: {},
      sectionFixFeedback: {},
      mascotState: "idle",
      pendingProveIt: null,
    });
  });
});

describe("useCvBuilderStore.resumeAppearance", () => {
  it("updates resume appearance controls and resets them to defaults", () => {
    const store = useCvBuilderStore.getState();

    store.setResumeAccentColor("#2563eb");
    store.setResumeFontScale("large");
    store.setResumePageMargin("compact");
    store.setResumeSectionSpacing("compact");
    store.setResumeHideSectionIcons(true);
    store.setResumeSidebarPosition("right");
    store.setResumeSidebarWidth("wide");
    store.setResumeDividerStyle("accent");
    store.setResumePictureVisible(false);
    store.setResumePictureShape("rounded");
    store.setResumePictureSize(120);
    store.setResumePictureBorderWidth(4);
    store.setResumePictureBorderColor("#2563eb");

    expect(useCvBuilderStore.getState()).toMatchObject({
      resumeAccentColor: "#2563eb",
      resumeFontScale: "large",
      resumePageMargin: "compact",
      resumeSectionSpacing: "compact",
      resumeHideSectionIcons: true,
      resumeSidebarPosition: "right",
      resumeSidebarWidth: "wide",
      resumeDividerStyle: "accent",
      resumePictureVisible: false,
      resumePictureShape: "rounded",
      resumePictureSize: 120,
      resumePictureBorderWidth: 4,
      resumePictureBorderColor: "#2563eb",
    });

    useCvBuilderStore.getState().reset();

    expect(useCvBuilderStore.getState()).toMatchObject({
      resumeAccentColor: "#0f172a",
      resumeFontScale: "normal",
      resumePageMargin: "normal",
      resumeSectionSpacing: "normal",
      resumeHideSectionIcons: false,
      resumeSidebarPosition: "left",
      resumeSidebarWidth: "normal",
      resumeDividerStyle: "line",
      resumePictureVisible: true,
      resumePictureShape: "circle",
      resumePictureSize: 64,
      resumePictureBorderWidth: 0,
      resumePictureBorderColor: "rgba(0,0,0,0)",
    });
  });

  it("applies template-specific appearance defaults when selecting a template", () => {
    useCvBuilderStore.getState().reset();

    useCvBuilderStore.getState().setTemplate("gengar");

    expect(useCvBuilderStore.getState()).toMatchObject({
      template: "gengar",
      resumeAccentColor: "#7c3aed",
      resumePageMargin: "compact",
      resumeSectionSpacing: "compact",
      resumeFontScale: "normal",
    });
  });
});

describe("useCvBuilderStore.sectionFixFeedback", () => {
  it("marks a section as needing re-check when its stale evaluation is cleared via manual edit default", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().setSectionEvaluation("summary", {
      score: 60,
      label: "Needs improvement",
      checklist: [],
      missing: ["Add more evidence"],
    });

    useCvBuilderStore.getState().clearSectionEvaluation("summary");

    expect(useCvBuilderStore.getState().sectionEvaluations.summary).toBeUndefined();
    expect(useCvBuilderStore.getState().sectionFixFeedback.summary).toMatchObject({
      status: "needs_recheck",
      source: "manual_edit",
    });
  });

  it("can store rich feedback properties like field path and previews with markSectionNeedsRecheck", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().setSectionEvaluation("experience", {
      score: 80,
      label: "Good",
      checklist: [],
      missing: [],
    });

    useCvBuilderStore.getState().markSectionNeedsRecheck("experience", {
      source: "assistant_patch",
      fieldPath: "doc.sections.experience.items.0.description",
      beforePreview: "before text",
      afterPreview: "after text",
    });

    expect(useCvBuilderStore.getState().sectionEvaluations.experience).toBeUndefined();
    expect(useCvBuilderStore.getState().sectionFixFeedback.experience).toMatchObject({
      status: "needs_recheck",
      source: "assistant_patch",
      fieldPath: "doc.sections.experience.items.0.description",
      beforePreview: "before text",
      afterPreview: "after text",
    });
  });

  it("clears the post-fix feedback once a fresh section evaluation arrives", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().clearSectionEvaluation("projects");

    useCvBuilderStore.getState().setSectionEvaluation("projects", {
      score: 90,
      label: "Good",
      checklist: [],
      missing: [],
    });

    expect(useCvBuilderStore.getState().sectionFixFeedback.projects).toBeUndefined();
    expect(useCvBuilderStore.getState().sectionEvaluations.projects?.score).toBe(90);
  });
});

describe("getSectionStatuses quality-gating", () => {
  const reset = () => useCvBuilderStore.getState().reset();

  it("marks Career Target needs-improvement when industry is gibberish", () => {
    reset();
    const s = useCvBuilderStore.getState();
    s.setCareerTarget("targetPosition", "Frontend Developer");
    s.setCareerTarget("careerLevel", "fresher");
    s.setCareerTarget("industry", "sssssssss");
    const career = useCvBuilderStore.getState().getSectionStatuses()[1];
    expect(career.status).toBe("needs-improvement");
  });

  it("marks Career Target needs-improvement on a role typo", () => {
    reset();
    const s = useCvBuilderStore.getState();
    s.setCareerTarget("targetPosition", "AI Enginer");
    s.setCareerTarget("careerLevel", "fresher");
    const career = useCvBuilderStore.getState().getSectionStatuses()[1];
    expect(career.status).toBe("needs-improvement");
    expect(career.reason).toContain("typo");
  });

  it("keeps Career Target completed for clean input", () => {
    reset();
    const s = useCvBuilderStore.getState();
    s.setCareerTarget("targetPosition", "Frontend Developer");
    s.setCareerTarget("careerLevel", "fresher");
    s.setCareerTarget("industry", "Fintech");
    const career = useCvBuilderStore.getState().getSectionStatuses()[1];
    expect(career.status).toBe("completed");
  });

  it("marks Summary needs-improvement when gibberish even if long", () => {
    reset();
    useCvBuilderStore.getState().setSummary("ssssssssssssssssssssssssssssssss");
    const summary = useCvBuilderStore.getState().getSectionStatuses()[2];
    expect(summary.status).toBe("needs-improvement");
  });
});

describe("useCvBuilderStore.structure", () => {
  it("updates section visibility", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().setSectionVisibility("summary", false);
    
    expect(useCvBuilderStore.getState().sectionVisibility.summary).toBe(false);
    expect(useCvBuilderStore.getState().sectionVisibility.experience).toBe(true);
  });

  it("updates section order", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().moveSection("experience", "up");
    
    expect(useCvBuilderStore.getState().sectionOrder[0]).toBe("experience");
    expect(useCvBuilderStore.getState().sectionOrder[1]).toBe("summary");
  });

  it("tracks collapsed section state without changing section content", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().setSummary("Built APIs");

    useCvBuilderStore.getState().toggleSectionCollapse("summary");
    expect(useCvBuilderStore.getState().collapsedSections.summary).toBe(true);
    expect(useCvBuilderStore.getState().summary).toBe("Built APIs");

    useCvBuilderStore.getState().setSectionCollapsed("summary", false);
    expect(useCvBuilderStore.getState().collapsedSections.summary).toBe(false);
    expect(useCvBuilderStore.getState().summary).toBe("Built APIs");
  });

  it("resets section order to default", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.getState().moveSection("experience", "up");
    useCvBuilderStore.getState().resetSectionOrder();
    
    expect(useCvBuilderStore.getState().sectionOrder).toEqual([
      "summary",
      "experience",
      "education",
      "projects",
      "certifications",
      "skills",
    ]);
  });

  it("moves sections within a layout group without crossing columns", () => {
    useCvBuilderStore.getState().reset();

    useCvBuilderStore.getState().moveSectionWithinGroup("skills", "up", ["summary", "skills", "certifications"]);

    expect(useCvBuilderStore.getState().sectionOrder).toEqual([
      "summary",
      "experience",
      "education",
      "projects",
      "skills",
      "certifications",
    ]);
  });

  it("reorders repeatable project items without losing their data", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      projects: [
        { id: "project-1", name: "First", role: "Developer", link: "", description: "", tools: "", contribution: "", result: "" },
        { id: "project-2", name: "Second", role: "Lead", link: "", description: "", tools: "", contribution: "", result: "" },
      ],
    });

    useCvBuilderStore.getState().moveProject("project-2", "up");

    expect(useCvBuilderStore.getState().projects.map((project) => project.name)).toEqual(["Second", "First"]);
    expect(useCvBuilderStore.getState().projects[0]).toMatchObject({ id: "project-2", role: "Lead" });
  });

  it("duplicates a project after the original and preserves its content", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      projects: [
        { id: "project-1", name: "Portfolio", role: "Developer", link: "https://example.com", description: "Built UI", tools: "React", contribution: "Frontend", result: "Shipped" },
      ],
    });

    useCvBuilderStore.getState().duplicateProject("project-1");

    const projects = useCvBuilderStore.getState().projects;
    expect(projects).toHaveLength(2);
    expect(projects[1]).toMatchObject({
      name: "Portfolio",
      role: "Developer",
      link: "https://example.com",
      description: "Built UI",
      tools: "React",
      contribution: "Frontend",
      result: "Shipped",
    });
    expect(projects[1].id).not.toBe("project-1");
  });

  it("allows removing the last project so the section can show its empty state", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      projects: [
        { id: "project-1", name: "Only Project", role: "Developer", link: "", description: "", tools: "", contribution: "", result: "" },
      ],
    });

    useCvBuilderStore.getState().removeProject("project-1");

    expect(useCvBuilderStore.getState().projects).toEqual([]);
  });

  it("reorders repeatable experience items without losing their data", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      experience: [
        { id: "exp-1", company: "First Co", position: "Intern", startDate: "", endDate: "", description: "", responsibilities: "", achievements: "", aiRewrite: "" },
        { id: "exp-2", company: "Second Co", position: "Developer", startDate: "", endDate: "", description: "", responsibilities: "", achievements: "", aiRewrite: "" },
      ],
    });

    useCvBuilderStore.getState().moveExperience("exp-2", "up");

    expect(useCvBuilderStore.getState().experience.map((experience) => experience.company)).toEqual(["Second Co", "First Co"]);
    expect(useCvBuilderStore.getState().experience[0]).toMatchObject({ id: "exp-2", position: "Developer" });
  });

  it("duplicates an experience entry after the original and preserves its content", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      experience: [
        { id: "exp-1", company: "SkillBridge", position: "Intern", startDate: "2026-01", endDate: "2026-06", description: "Built features", responsibilities: "Frontend", achievements: "Improved flow", aiRewrite: "Rewrite" },
      ],
    });

    useCvBuilderStore.getState().duplicateExperience("exp-1");

    const experience = useCvBuilderStore.getState().experience;
    expect(experience).toHaveLength(2);
    expect(experience[1]).toMatchObject({
      company: "SkillBridge",
      position: "Intern",
      startDate: "2026-01",
      endDate: "2026-06",
      description: "Built features",
      responsibilities: "Frontend",
      achievements: "Improved flow",
      aiRewrite: "Rewrite",
    });
    expect(experience[1].id).not.toBe("exp-1");
  });

  it("allows removing the last experience so the section can show its empty state", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      experience: [
        { id: "exp-1", company: "Only Co", position: "Intern", startDate: "", endDate: "", description: "", responsibilities: "", achievements: "", aiRewrite: "" },
      ],
    });

    useCvBuilderStore.getState().removeExperience("exp-1");

    expect(useCvBuilderStore.getState().experience).toEqual([]);
  });
});

describe("useCvBuilderStore P4 custom sections and layout", () => {
  const baseDoc = (activities: CanonicalCvDocument["activities"]): CanonicalCvDocument => ({
    language: "vi",
    contact: { name: "A", email: "", phone: "", location: "", links: [] },
    summary: "",
    education: [],
    experience: [],
    projects: [],
    skills: { technical: [], soft: [], languages: [], tools: [] },
    certifications: [],
    activities,
  });

  it("keeps local custom sections (headings intact) when hydrating the SAME CV with matching content", () => {
    useCvBuilderStore.getState().reset();
    const local = [
      {
        id: "custom_1",
        title: "Hoạt động",
        placement: "main" as const,
        visible: true,
        items: [{ id: "i1", heading: "CLB Guitar", body: "Trưởng nhóm 2024" }],
      },
    ];
    useCvBuilderStore.setState({ customSections: local, customSectionsCvId: "cv-1", draftId: "cv-1" });

    // Recover after refresh: same CV + server activities == local projection -> local wins.
    useCvBuilderStore.getState().hydrateFromCanonical(
      baseDoc([{ org: "Hoạt động", role: null, bullets: ["CLB Guitar: Trưởng nhóm 2024"] }]),
      { cvId: "cv-1" },
    );
    expect(useCvBuilderStore.getState().customSections).toEqual(local);
  });

  it("never bleeds hidden local sections into a DIFFERENT CV (empty projection is not a match)", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      customSections: [
        { id: "custom_1", title: "Bí mật CV A", placement: "main", visible: false, items: [{ id: "i1", body: "riêng tư" }] },
      ],
      customSectionsCvId: "cv-A",
    });

    // Open CV B (deep link, no reset): both projections are [] but the CV differs.
    useCvBuilderStore.getState().hydrateFromCanonical(baseDoc([]), { cvId: "cv-B" });

    expect(useCvBuilderStore.getState().customSections).toEqual([]);
    expect(useCvBuilderStore.getState().customSectionsCvId).toBe("cv-B");
  });

  it("keeps hidden sections and reuses placement by title when the same CV's server content wins", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      customSections: [
        { id: "custom_vis", title: "Hoạt động", placement: "sidebar", visible: true, items: [{ id: "i1", body: "cũ" }] },
        { id: "custom_hid", title: "Nháp", placement: "main", visible: false, items: [{ id: "i2", body: "đang soạn" }] },
      ],
      customSectionsCvId: "cv-1",
      draftId: "cv-1",
    });

    // Same CV, server content changed (cross-device edit).
    useCvBuilderStore.getState().hydrateFromCanonical(
      baseDoc([{ org: "Hoạt động", role: null, bullets: ["mới từ máy khác"] }]),
      { cvId: "cv-1", preserveDraft: true },
    );

    const sections = useCvBuilderStore.getState().customSections;
    const visible = sections.find((section) => section.title === "Hoạt động");
    // Server content wins but local id/placement survive the title match.
    expect(visible?.items[0].body).toBe("mới từ máy khác");
    expect(visible?.id).toBe("custom_vis");
    expect(visible?.placement).toBe("sidebar");
    // Hidden sections are local-only by design — they must not be wiped.
    expect(sections.some((section) => section.id === "custom_hid")).toBe(true);
  });

  it("lets the document win when activities differ (version restore / cross-device edit)", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      customSections: [
        { id: "custom_1", title: "Cũ", placement: "main", visible: true, items: [{ id: "i1", body: "nội dung cũ" }] },
      ],
      draftId: "draft-1",
    });

    useCvBuilderStore.getState().hydrateFromCanonical(
      baseDoc([{ org: "Giải thưởng", role: null, bullets: ["Học bổng kỳ 1"] }]),
      { preserveDraft: true },
    );

    const sections = useCvBuilderStore.getState().customSections;
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Giải thưởng");
    expect(sections[0].items[0].body).toBe("Học bổng kỳ 1");
  });

  it("sanitizes structural fields coming from an imported backup", () => {
    useCvBuilderStore.getState().reset();

    useCvBuilderStore.getState().importState({
      customSections: [{ title: "OK", items: [{ body: "text" }], visible: true }, 42, null] as never,
      layoutPages: [{ id: "" }, "junk", { id: "pg_2", fullWidth: "yes" }] as never,
      sectionPage: { experience: "pg_2", skills: 7, nested: { a: 1 } } as never,
    });

    const state = useCvBuilderStore.getState();
    expect(state.customSections).toHaveLength(1);
    expect(state.customSections[0].id).toMatch(/^custom_/);
    expect(state.layoutPages.every((page) => typeof page.id === "string" && page.id)).toBe(true);
    expect(state.layoutPages.find((page) => page.id === "pg_2")?.fullWidth).toBeUndefined();
    expect(state.sectionPage).toEqual({ experience: "pg_2" });
  });

  it("import of a pre-P4 backup (no structural keys) clears the current CV's layout and custom sections", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      customSections: [
        { id: "custom_1", title: "Của CV hiện tại", placement: "main", visible: true, items: [{ id: "i1", body: "x" }] },
      ],
      layoutPages: [{ id: "pg_1" }, { id: "pg_2" }],
      sectionPage: { education: "pg_2" },
    });

    // A backup exported before P4 has none of the structural keys.
    useCvBuilderStore.getState().importState({ fullName: "Imported User" });

    const state = useCvBuilderStore.getState();
    expect(state.fullName).toBe("Imported User");
    expect(state.customSections).toEqual([]);
    expect(state.layoutPages).toEqual([{ id: "page_1" }]);
    expect(state.sectionPage).toEqual({});
  });

  it("drops imported page assignments that point at nonexistent pages", () => {
    useCvBuilderStore.getState().reset();

    useCvBuilderStore.getState().importState({
      layoutPages: [{ id: "pg_1" }],
      sectionPage: { education: "pg_ghost", skills: "pg_1" },
    } as never);

    expect(useCvBuilderStore.getState().sectionPage).toEqual({ skills: "pg_1" });
  });

  it("removing a page reassigns its sections to the first remaining page", () => {
    useCvBuilderStore.getState().reset();
    useCvBuilderStore.setState({
      layoutPages: [{ id: "pg_1" }, { id: "pg_2" }],
      sectionPage: { education: "pg_2", skills: "pg_1" },
    });

    useCvBuilderStore.getState().removeLayoutPage("pg_2");

    const state = useCvBuilderStore.getState();
    expect(state.layoutPages).toEqual([{ id: "pg_1" }]);
    expect(state.sectionPage.education).toBe("pg_1");
  });
});
