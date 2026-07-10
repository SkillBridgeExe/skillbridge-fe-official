import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { adaptCvBuilderStoreToResumeData, adaptResumeDataToCanonical, adaptCanonicalToResumeData } from "./adapter";
import type { CvBuilderState } from "@/store/useCvBuilderStore";
import { getTemplateLayoutCapabilities } from "./template-meta";

const currentDir = dirname(fileURLToPath(import.meta.url));

const listTemplateFiles = (dir: string): string[] => {
	const entries = readdirSync(dir);
	return entries.flatMap((entry) => {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) return listTemplateFiles(path);
		return path.endsWith(".tsx") ? [path] : [];
	});
};

describe("adaptCvBuilderStoreToResumeData", () => {
	it("keeps PDF template optional contact guards boolean-safe", () => {
		const templateDir = join(currentDir, "pdf", "templates");
		const offenders = listTemplateFiles(templateDir).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			const matches = source.match(/\{basics\.(email|phone|location|headline|name)\s*&&/g) ?? [];
			return matches.map((match) => `${file}: ${match}`);
		});

		expect(offenders).toEqual([]);
	});

	it("should correctly map basic info", () => {
		const mockStore = {
			fullName: "John Doe",
			targetPosition: "Software Engineer",
			email: "john@example.com",
			phone: "1234567890",
			location: "Hanoi, Vietnam",
			portfolio: "https://johndoe.com",
			linkedin: "https://linkedin.com/in/johndoe",
			github: "https://github.com/johndoe",
			cvLanguage: "en",
			template: "gengar",
			resumePictureVisible: true,
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.basics.name).toBe("John Doe");
		expect(result.basics.headline).toBe("Software Engineer");
		expect(result.basics.email).toBe("john@example.com");
		expect(result.basics.phone).toBe("1234567890");
		expect(result.basics.location).toBe("Hanoi, Vietnam");
		expect(result.basics.website.url).toBe("https://johndoe.com");
		expect(result.basics.customFields).toHaveLength(2); // linkedin and github
		expect(result.basics.customFields[0].icon).toBe("linkedin-logo");
		expect(result.basics.customFields[1].icon).toBe("github-logo");
	});

	it("maps profile photo, dynamic links, custom fields, and language proficiency", () => {
		const mockStore = {
			fullName: "John Doe",
			targetPosition: "Software Engineer",
			email: "",
			phone: "",
			location: "",
			portfolio: "",
			linkedin: "",
			github: "",
			photoUrl: "https://example.com/photo.jpg",
			profileLinks: [
				{ id: "profile-1", network: "Medium", url: "https://medium.com/@john", label: "Writing", visible: true },
				{ id: "profile-hidden", network: "Website", url: "https://hidden.example.com", visible: false },
			],
			customFields: [{ id: "field-1", name: "Work authorization", value: "Vietnam", icon: "passport" }],
			cvLanguage: "en",
			template: "gengar",
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			languageDetails: [{ id: "lang-1", name: "English", proficiency: "Professional" }],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.picture).toMatchObject({
			hidden: false,
			url: "https://example.com/photo.jpg",
		});
		expect(result.basics.customFields).toEqual([
			expect.objectContaining({ id: "profile-1", text: "Writing", link: "https://medium.com/@john" }),
			expect.objectContaining({ id: "field-1", text: "Work authorization: Vietnam", link: "" }),
		]);
		expect(result.basics.customFields).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ id: "profile-hidden" })]),
		);
		expect(result.sections.languages.hidden).toBe(false);
		expect(result.sections.languages.items).toEqual([
			expect.objectContaining({ id: "lang-1", language: "English", fluency: "Professional" }),
		]);
	});

	it("should handle HTML wrapping for multi-line text", () => {
		const mockStore = {
			fullName: "",
			summary: "Hello\nWorld",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.summary.content).toBe("<p>Hello<br/>World</p>");
	});

	it("escapes plain text before wrapping it as HTML", () => {
		const mockStore = {
			fullName: "",
			summary: "React < Node & Express",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.summary.content).toBe("<p>React &lt; Node &amp; Express</p>");
	});

	it("converts plain-text bullets into safe resume HTML lists", () => {
		const mockStore = {
			fullName: "",
			summary: "- Built REST APIs\n- Reduced load time",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.summary.content).toBe("<ul><li>Built REST APIs</li><li>Reduced load time</li></ul>");
	});

	it("normalizes legacy builder HTML before sending content to the PDF renderer", () => {
		const mockStore = {
			fullName: "",
			summary: "<ul><li>Built REST APIs</li><li>Reduced load time</li></ul><script>alert(1)</script>",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.summary.content).toBe("<ul><li>Built REST APIs</li><li>Reduced load time</li></ul>");
		expect(result.summary.content).not.toContain("<script>");
		expect(result.summary.content).not.toContain("alert");
	});

	it("renders markdown-lite formatting while escaping unsupported HTML", () => {
		const mockStore = {
			fullName: "",
			summary: "**React** _intern_ [repo](https://github.com/acme/app) <script>alert(1)</script>",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.summary.content).toContain("<strong>React</strong>");
		expect(result.summary.content).toContain("<em>intern</em>");
		expect(result.summary.content).toContain('<a href="https://github.com/acme/app">repo</a>');
		expect(result.summary.content).not.toContain("<script>");
		expect(result.summary.content).not.toContain("alert");
	});

	it("falls back legacy builder templates to a valid resume-engine template", () => {
		const mockStore = {
			fullName: "Legacy Template User",
			template: "ats-modern",
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.metadata.template).toBe("onyx");
	});

	it("maps builder appearance settings into resume metadata", () => {
		const mockStore = {
			fullName: "Styled User",
			template: "onyx",
			cvLanguage: "en",
			resumeAccentColor: "#2563eb",
			resumeFontScale: "large",
			resumePageMargin: "compact",
			resumeSectionSpacing: "compact",
			resumeHideSectionIcons: true,
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.metadata.design.colors.primary).toBe("#2563eb");
		expect(result.metadata.typography.body.fontSize).toBeGreaterThan(11);
		expect(result.metadata.typography.heading.fontSize).toBeGreaterThan(14);
		expect(result.metadata.page.gapY).toBeLessThan(16);
		expect(result.metadata.page.marginY).toBeLessThan(24);
		expect(result.metadata.page.hideSectionIcons).toBe(true);
	});

	it("maps ATS Safe Mode overrides into resume metadata", () => {
		const mockStore = {
			fullName: "ATS User",
			template: "onyx",
			cvLanguage: "en",
			resumeAccentColor: "#2563eb",
			resumeHideSectionIcons: false,
			resumeAtsSafeMode: true,
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		// ATS mode overrides
		expect(result.metadata.design.colors.primary).toBe("#000000");
		expect(result.metadata.design.colors.text).toBe("#000000");
		expect(result.metadata.page.hideIcons).toBe(true);
		expect(result.metadata.page.hideSectionIcons).toBe(true);
		expect(result.metadata.page.simplifyDecorations).toBe(true);
		expect(result.metadata.design.dividerStyle).toBe("line");
		expect(result.picture.hidden).toBe(true);
	});

	it("maps bounded layout controls into resume metadata for sidebar templates", () => {
		const mockStore = {
			fullName: "Layout User",
			template: "gengar",
			cvLanguage: "en",
			resumeSidebarPosition: "right",
			resumeSidebarWidth: "wide",
			resumeDividerStyle: "accent",
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.metadata.layout.sidebarPosition).toBe("right");
		expect(result.metadata.layout.sidebarWidth).toBe(42);
		expect(result.metadata.design.dividerStyle).toBe("accent");
	});

	it("hides profile photo when the selected template does not support avatars", () => {
		const result = adaptCvBuilderStoreToResumeData({
			fullName: "John Doe",
			photoUrl: "https://example.com/photo.jpg",
			template: "onyx",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState);

		expect(result.picture.hidden).toBe(true);
	});

	it("hides profile photo when the user disables avatar visibility", () => {
		const result = adaptCvBuilderStoreToResumeData({
			fullName: "John Doe",
			photoUrl: "https://example.com/photo.jpg",
			template: "gengar",
			resumePictureVisible: false,
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState);

		expect(result.picture.hidden).toBe(true);
	});

	it("uses renderer sidebar sections for templates that actually render side columns", () => {
		const mockStore = {
			fullName: "Column User",
			template: "azurill",
			cvLanguage: "en",
			resumeSidebarWidth: "wide",
			summary: "Frontend developer with React experience.",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: ["React", "TypeScript"],
			softSkills: [],
			tools: [],
			languages: [{ id: "lang-1", language: "English", proficiency: "B2" }],
			certifications: [{ id: "cert-1", name: "TOEIC", organization: "", issueDate: "", credentialUrl: "" }],
			sectionOrder: ["summary", "experience", "education", "projects", "certifications", "skills"],
			sectionPlacement: {},
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.metadata.layout.sidebarWidth).toBe(42);
		expect(result.metadata.layout.pages[0]?.main).toEqual(["experience", "education", "projects"]);
		expect(result.metadata.layout.pages[0]?.sidebar).toEqual(["summary", "certifications", "skills", "languages"]);
	});

	it("does not advertise sidebar position controls for split templates until templates apply position", () => {
		expect(getTemplateLayoutCapabilities("chikorita")).toMatchObject({
			supportsSidebar: true,
			usesSidebarSections: true,
			supportsSidebarWidth: true,
			supportsSidebarPosition: false,
		});
		expect(getTemplateLayoutCapabilities("gengar")).toMatchObject({
			supportsSidebar: true,
			usesSidebarSections: true,
			supportsSidebarWidth: true,
			supportsSidebarPosition: true,
		});
		expect(getTemplateLayoutCapabilities("bronzor")).toMatchObject({
			supportsSidebar: false,
			usesSidebarSections: true,
			supportsSidebarWidth: false,
			supportsSidebarPosition: false,
		});
		expect(getTemplateLayoutCapabilities("azurill")).toMatchObject({
			supportsSidebar: true,
			usesSidebarSections: true,
			supportsSidebarWidth: true,
			supportsSidebarPosition: false,
		});
		expect(getTemplateLayoutCapabilities("onyx")).toMatchObject({
			supportsSidebar: false,
			usesSidebarSections: true,
			supportsSidebarWidth: false,
			supportsSidebarPosition: false,
		});
	});

	it("does not write unsupported sidebar position values for split templates", () => {
		const mockStore = {
			fullName: "Split User",
			template: "chikorita",
			cvLanguage: "en",
			resumeSidebarPosition: "right",
			resumeSidebarWidth: "narrow",
			resumeDividerStyle: "subtle",
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.metadata.layout.sidebarPosition).toBe("left");
		expect(result.metadata.layout.sidebarWidth).toBe(28);
		expect(result.metadata.design.dividerStyle).toBe("subtle");
	});

	it("maps builder structure visibility into resume sections", () => {
		const mockStore = {
			fullName: "Structure User",
			template: "onyx",
			cvLanguage: "en",
			summary: "Frontend developer with React experience.",
			sectionVisibility: {
				summary: false,
				education: true,
				experience: true,
				projects: false,
				skills: true,
				certifications: true,
			},
			education: [],
			experience: [],
			projects: [{ id: "project-1", name: "Visible Data", role: "Developer", link: "", description: "Built a feature", tools: "React", contribution: "", result: "" }],
			technicalSkills: ["React"],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.summary.hidden).toBe(true);
		expect(result.sections.projects.hidden).toBe(true);
		expect(result.sections.skills.hidden).toBe(false);
	});

	it("maps builder section order into supported main/sidebar layout order", () => {
		const mockStore = {
			fullName: "Ordered User",
			template: "onyx",
			cvLanguage: "en",
			summary: "Backend developer.",
			sectionOrder: ["skills", "projects", "experience", "education", "summary", "certifications"],
			sectionVisibility: {
				summary: true,
				education: true,
				experience: true,
				projects: true,
				skills: true,
				certifications: true,
			},
			education: [{ id: "edu-1", school: "FPT", major: "SE", degree: "", startYear: "", endYear: "", gpa: "", coursework: "", achievements: "" }],
			experience: [{ id: "exp-1", company: "A", position: "Developer", startDate: "", endDate: "", description: "", responsibilities: "", achievements: "", aiRewrite: "" }],
			projects: [{ id: "project-1", name: "Project", role: "", link: "", description: "", tools: "", contribution: "", result: "" }],
			technicalSkills: ["React"],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [{ id: "cert-1", name: "Cert", organization: "", issueDate: "", credentialUrl: "" }],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);

		expect(result.metadata.layout.pages[0].main).toEqual(["projects", "experience", "education"]);
		expect(result.metadata.layout.pages[0].sidebar).toEqual(["skills", "summary", "certifications", "languages"]);
	});

	it("maps the planned pages and custom sections into renderer layout for representative templates", () => {
		// One per layout family: split, sidebar, minimal/grouped, timeline, ATS-compact.
		const representatives = ["azurill", "gengar", "onyx", "kakuna", "glalie"] as const;

		for (const template of representatives) {
			const mockStore = {
				fullName: "Layout User",
				template,
				cvLanguage: "en",
				summary: "Summary.",
				sectionOrder: ["summary", "experience", "education", "projects", "skills", "certifications"],
				sectionVisibility: { summary: true, education: true, experience: true, projects: true, skills: true, certifications: true },
				sectionPlacement: {},
				layoutPages: [{ id: "pg_1", name: "Main" }, { id: "pg_2" }],
				sectionPage: { education: "pg_2", custom_extra: "pg_2" },
				customSections: [
					{
						id: "custom_extra",
						title: "Hoạt động",
						placement: "main",
						visible: true,
						items: [{ id: "i1", heading: "CLB <Guitar>", body: "Trưởng nhóm 2024" }],
					},
				],
				education: [],
				experience: [],
				projects: [],
				technicalSkills: [],
				softSkills: [],
				tools: [],
				languages: [],
				certifications: [],
			} as unknown as CvBuilderState;

			const result = adaptCvBuilderStoreToResumeData(mockStore);

			// Same page plan drives preview and download (they share this data),
			// so logical page-count parity is structural.
			expect(result.metadata.layout.pages, template).toHaveLength(2);
			expect(result.metadata.layout.pages[1].main, template).toContain("education");
			expect(result.metadata.layout.pages[1].main, template).toContain("custom_extra");
			expect(result.metadata.layout.pages[0].main, template).not.toContain("education");

			const custom = result.customSections.find((section) => section.id === "custom_extra");
			expect(custom, template).toBeDefined();
			expect(custom?.type, template).toBe("summary");
			expect(custom?.hidden, template).toBe(false);
			const item = custom?.items[0] as { content: string } | undefined;
			// Heading is escaped user text — markup cannot be injected.
			expect(item?.content, template).toContain("<strong>CLB &lt;Guitar&gt;</strong>");
			expect(item?.content, template).toContain("Trưởng nhóm 2024");
		}
	});

	it("keeps hidden custom sections out of the rendered output but in the data", () => {
		const mockStore = {
			fullName: "",
			template: "onyx",
			summary: "",
			sectionOrder: ["summary", "experience", "education", "projects", "skills", "certifications"],
			customSections: [
				{ id: "custom_hidden", title: "Ẩn", placement: "main", visible: false, items: [{ id: "i1", body: "x" }] },
			],
			education: [],
			experience: [],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		const custom = result.customSections.find((section) => section.id === "custom_hidden");
		expect(custom?.hidden).toBe(true);
	});

	it("does not turn empty builder placeholder rows into fake resume entries", () => {
		const mockStore = {
			fullName: "",
			summary: "",
			education: [{ id: "edu-empty", school: "", major: "", degree: "", startYear: "", endYear: "", gpa: "", coursework: "", achievements: "" }],
			experience: [{ id: "exp-empty", company: "", position: "", startDate: "", endDate: "", description: "", responsibilities: "", achievements: "", aiRewrite: "" }],
			projects: [{ id: "proj-empty", name: "", role: "", link: "", description: "", tools: "", contribution: "", result: "" }],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [{ id: "cert-empty", name: "", organization: "", issueDate: "", credentialUrl: "" }],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.sections.education.hidden).toBe(true);
		expect(result.sections.education.items).toHaveLength(0);
		expect(result.sections.experience.hidden).toBe(true);
		expect(result.sections.experience.items).toHaveLength(0);
		expect(result.sections.projects.hidden).toBe(true);
		expect(result.sections.projects.items).toHaveLength(0);
		expect(result.sections.certifications.hidden).toBe(true);
		expect(result.sections.certifications.items).toHaveLength(0);
	});

	it("should map experience correctly", () => {
		const mockStore = {
			fullName: "",
			summary: "",
			education: [],
			experience: [
				{
					id: "exp-1",
					company: "Tech Corp",
					position: "Developer",
					startDate: "Jan 2020",
					endDate: "Present",
					description: "Did things",
					responsibilities: "Writing code",
					achievements: "Fixed bugs",
					aiRewrite: "",
				},
			],
			projects: [],
			technicalSkills: [],
			softSkills: [],
			tools: [],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		expect(result.sections.experience.items).toHaveLength(1);
		const item = result.sections.experience.items[0];
		expect(item.company).toBe("Tech Corp");
		expect(item.position).toBe("Developer");
		expect(item.period).toBe("Jan 2020 - Present");
		// Should join description, responsibilities, achievements with \n\n
		expect(item.description).toContain("<p>Did things<br/><br/>Writing code<br/><br/>Fixed bugs</p>");
	});

	it("should map skills correctly into a grouped structure", () => {
		const mockStore = {
			fullName: "",
			summary: "",
			education: [],
			experience: [],
			projects: [],
			technicalSkills: ["React", "TypeScript"],
			softSkills: ["Communication"],
			tools: ["Git"],
			languages: [],
			certifications: [],
		} as unknown as CvBuilderState;

		const result = adaptCvBuilderStoreToResumeData(mockStore);
		const skills = result.sections.skills.items;
		expect(skills).toHaveLength(3); // Technical, Soft Skills, Tools
		expect(skills[0].name).toBe("Technical");
		expect(skills[0].keywords).toEqual(["React", "TypeScript"]);
		expect(skills[1].name).toBe("Soft Skills");
		expect(skills[1].keywords).toEqual(["Communication"]);
		expect(skills[2].name).toBe("Tools");
		expect(skills[2].keywords).toEqual(["Git"]);
	});

	it("produces stable output for identical builder state to avoid preview rerender loops", () => {
		const mockStore = {
			fullName: "Stable Preview",
			targetPosition: "Frontend Developer",
			email: "stable@example.com",
			phone: "0901234567",
			location: "Ho Chi Minh City",
			portfolio: "https://stable.dev",
			linkedin: "https://linkedin.com/in/stable",
			github: "https://github.com/stable",
			cvLanguage: "en",
			template: "azurill",
			summary: "Builds accessible React applications.",
			education: [{ id: "", school: "FPT University", major: "Software Engineering", degree: "Bachelor", startYear: "2022", endYear: "2026", gpa: "", coursework: "", achievements: "" }],
			experience: [{ id: "", company: "SkillBridge", position: "Intern", startDate: "2025", endDate: "2026", description: "Built UI", responsibilities: "", achievements: "", aiRewrite: "" }],
			projects: [{ id: "", name: "CV Builder", role: "Developer", link: "https://github.com/stable/cv", description: "Built preview", tools: "React, TypeScript", contribution: "", result: "" }],
			technicalSkills: ["React", "TypeScript"],
			softSkills: ["Communication"],
			tools: ["Git"],
			languages: ["English"],
			certifications: [{ id: "", name: "React Basics", organization: "Meta", issueDate: "2025", credentialUrl: "https://example.com/cert" }],
		} as unknown as CvBuilderState;

		const first = adaptCvBuilderStoreToResumeData(mockStore);
		const second = adaptCvBuilderStoreToResumeData(mockStore);

		expect(second).toEqual(first);
		expect(first.basics.customFields.map((field) => field.id)).toEqual([
			"custom-field_linkedin_https-linkedin-com-in-stable",
			"custom-field_github_https-github-com-stable",
		]);
		expect(first.sections.skills.items.map((item) => item.id)).toEqual([
			"skill-technical",
			"skill-soft",
			"skill-tools",
		]);
	});

});

describe("adapter round-trip: ResumeData -> CanonicalCvDocument -> ResumeData", () => {
	it("should preserve key fields when mapping back and forth", () => {
		const mockResumeData = adaptCvBuilderStoreToResumeData({
			fullName: "Jane Smith",
			targetPosition: "Data Scientist",
			email: "jane@example.com",
			phone: "9876543210",
			location: "HCMC, Vietnam",
			portfolio: "https://janesmith.com",
			linkedin: "https://linkedin.com/in/janesmith",
			github: "https://github.com/janesmith",
			cvLanguage: "vi",
			template: "onyx",
			summary: "Experienced data scientist",
			education: [
				{
					id: "edu-1",
					school: "Science University",
					major: "Computer Science",
					degree: "Bachelor",
					startYear: "2015",
					endYear: "2019",
					gpa: "3.8/4.0",
					coursework: "AI, ML",
					achievements: "Valedictorian"
				}
			],
			experience: [
				{
					id: "exp-1",
					company: "AI Startup",
					position: "ML Engineer",
					startDate: "Jan 2020",
					endDate: "Dec 2022",
					description: "Worked on cool stuff",
					responsibilities: "Trained models",
					achievements: "Improved accuracy by 10%"
				}
			],
			projects: [
				{
					id: "proj-1",
					name: "Recommendation Engine",
					role: "Lead",
					tools: "Python, PyTorch",
					link: "https://github.com/janesmith/recsys",
					description: "Built a recsys",
					contribution: "Designed architecture",
					result: "Deployed to prod"
				}
			],
			technicalSkills: ["Python", "PyTorch"],
			softSkills: ["Leadership"],
			tools: ["Git"],
			languages: ["English", "Vietnamese"],
			certifications: [
				{
					id: "cert-1",
					name: "AWS ML Specialty",
					organization: "AWS",
					issueDate: "2021",
					credentialUrl: "https://aws.amazon.com"
				}
			],
		} as unknown as CvBuilderState);
		const canonical = adaptResumeDataToCanonical(mockResumeData);
		const roundTripped = adaptCanonicalToResumeData(canonical);

		// Basic info
		expect(roundTripped.basics.name).toBe("Jane Smith");
		expect(roundTripped.basics.email).toBe("jane@example.com");
		expect(roundTripped.basics.phone).toBe("9876543210");
		expect(roundTripped.basics.location).toBe("HCMC, Vietnam");
		expect(roundTripped.basics.website.url).toBe("https://janesmith.com");
		expect(roundTripped.basics.customFields.length).toBeGreaterThan(0); // linkedin/github are preserved in some form

		// Summary
		expect(roundTripped.summary.content).toContain("Experienced data scientist");

		// Education
		const edu = roundTripped.sections.education.items[0];
		expect(edu.school).toBe("Science University");
		expect(edu.degree).toBe("Bachelor");
		expect(edu.area).toBe("Computer Science");
		expect(edu.period).toBe("2015 - 2019");
		expect(edu.description).toContain("AI, ML");

		// Experience
		const exp = roundTripped.sections.experience.items[0];
		expect(exp.company).toBe("AI Startup");
		expect(exp.position).toBe("ML Engineer");
		expect(exp.period).toBe("Jan 2020 - Dec 2022");
		expect(exp.description).toContain("Worked on cool stuff");
		expect(exp.description).toContain("Trained models");

		// Projects
		const proj = roundTripped.sections.projects.items[0];
		expect(proj.name).toBe("Recommendation Engine");
		expect(proj.description).toContain("Role: Lead");
		expect(proj.description).toContain("Tools: Python, PyTorch");
		expect(proj.description).toContain("Built a recsys");
		expect(proj.website.url).toBe("https://github.com/janesmith/recsys");

		// Skills
		const techSkills = roundTripped.sections.skills.items.find(i => i.name === "Technical");
		expect(techSkills?.keywords).toEqual(["Python", "PyTorch"]);

		// Certifications
		const cert = roundTripped.sections.certifications.items[0];
		expect(cert.title).toBe("AWS ML Specialty");
		expect(cert.issuer).toBe("AWS");
		expect(cert.date).toBe("2021");
	});
});
