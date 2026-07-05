import { describe, it, expect } from "vitest";
import { adaptCvBuilderStoreToResumeData, adaptResumeDataToCanonical, adaptCanonicalToResumeData } from "./adapter";
import type { CvBuilderState } from "@/store/useCvBuilderStore";

describe("adaptCvBuilderStoreToResumeData", () => {
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
			template: "onyx",
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
			resumeDensity: "compact",
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
