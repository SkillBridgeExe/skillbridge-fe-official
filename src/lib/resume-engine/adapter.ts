import type { CanonicalCvDocument } from "@shared/api";
import type { CvBuilderState } from "@/store/useCvBuilderStore";
import type { ResumeData } from "./schema/resume/data";
import { templateSchema, type Template } from "./schema/templates";

const hasText = (...values: Array<string | null | undefined>): boolean =>
	values.some((value) => Boolean(value?.trim()));

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const resolveTemplate = (template: string | undefined): Template =>
	(templateSchema.options as readonly string[]).includes(template ?? "") ? (template as Template) : "onyx";

const FONT_SCALE = {
	small: { body: 10, heading: 13 },
	normal: { body: 11, heading: 14 },
	large: { body: 12, heading: 16 },
} as const;

const DENSITY = {
	compact: { gap: 12, margin: 18 },
	comfortable: { gap: 16, margin: 24 },
} as const;

const resolveFontScale = (scale: unknown) =>
	scale === "small" || scale === "large" || scale === "normal" ? FONT_SCALE[scale] : FONT_SCALE.normal;

const resolveDensity = (density: unknown) =>
	density === "compact" || density === "comfortable" ? DENSITY[density] : DENSITY.comfortable;

const resolveAccentColor = (color: unknown) =>
	typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#0f172a";

const normalizeIdPart = (value: unknown): string =>
	String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48) || "empty";

const stableId = (prefix: string, ...parts: unknown[]): string =>
	[prefix, ...parts.map(normalizeIdPart)].join("_");

/**
 * Wraps simple text with HTML paragraphs if it's not already HTML,
 * because Resume Engine expects HTML content.
 */
function toHtml(text: string | undefined): string {
	if (!text) return "";
	if (text.includes("<p>") || text.includes("<ul>") || text.includes("<li>")) return text;
	
	// Convert newlines to paragraphs/breaks or simply wrap in <p>
	return `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`;
}

/**
 * Converts HTML content from Resume Engine back to plain string bullets
 * for CanonicalCvDocument.
 */
function htmlToBullets(html: string | undefined): string[] {
	if (!html) return [];
	let text = html.replace(/<p>/gi, "").replace(/<\/p>/gi, "\n");
	text = text.replace(/<br\s*\/?>/gi, "\n");
	text = text.replace(/<[^>]+>/g, ""); // Strip remaining HTML tags
	return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

/**
 * Maps the flat `useCvBuilderStore` state into the nested `ResumeData`
 * schema expected by the @resume-engine/pdf renderer.
 */
export function adaptCvBuilderStoreToResumeData(store: CvBuilderState): ResumeData {
	const fontScale = resolveFontScale(store.resumeFontScale);
	const density = resolveDensity(store.resumeDensity);
	const accentColor = resolveAccentColor(store.resumeAccentColor);

	const educationItems = store.education
		.filter((edu) => hasText(edu.school, edu.major, edu.degree, edu.startYear, edu.endYear, edu.gpa, edu.coursework, edu.achievements))
		.map((edu, index) => ({
			id: edu.id || stableId("education", index, edu.school, edu.major, edu.degree),
			hidden: false,
			school: edu.school || "",
			degree: edu.degree || "",
			area: edu.major || "",
			grade: edu.gpa || "",
			location: "",
			period: [edu.startYear, edu.endYear].filter(Boolean).join(" - "),
			website: { url: "", label: "", inlineLink: false },
			description: toHtml([edu.coursework, edu.achievements].filter(Boolean).join("\n\n")),
		}));

	const experienceItems = store.experience
		.filter((exp) => hasText(exp.company, exp.position, exp.startDate, exp.endDate, exp.description, exp.responsibilities, exp.achievements))
		.map((exp, index) => ({
			id: exp.id || stableId("experience", index, exp.company, exp.position),
			hidden: false,
			company: exp.company || "",
			position: exp.position || "",
			location: "",
			period: [exp.startDate, exp.endDate].filter(Boolean).join(" - "),
			website: { url: "", label: "", inlineLink: false },
			description: toHtml([exp.description, exp.responsibilities, exp.achievements].filter(Boolean).join("\n\n")),
			roles: [],
		}));

	const projectItems = store.projects
		.filter((proj) => hasText(proj.name, proj.role, proj.link, proj.description, proj.tools, proj.contribution, proj.result))
		.map((proj, index) => ({
			id: proj.id || stableId("project", index, proj.name, proj.role),
			hidden: false,
			name: proj.name || "",
			period: "", // projects in old builder don't have dates
			website: { url: proj.link || "", label: proj.link || "", inlineLink: false },
			description: toHtml([
				proj.role ? `Role: ${proj.role}` : "",
				proj.tools ? `Tools: ${proj.tools}` : "",
				proj.description,
				proj.contribution,
				proj.result,
			].filter(Boolean).join("\n\n")),
		}));

	const certificationItems = store.certifications
		.filter((cert) => hasText(cert.name, cert.organization, cert.issueDate, cert.credentialUrl))
		.map((cert, index) => ({
			id: cert.id || stableId("certification", index, cert.name, cert.organization),
			hidden: false,
			title: cert.name || "",
			issuer: cert.organization || "",
			date: cert.issueDate || "",
			website: { url: cert.credentialUrl || "", label: cert.credentialUrl || "", inlineLink: false },
			description: "",
		}));

	return {
		picture: {
			hidden: true, // We don't have a picture field in CvBuilderStore currently
			url: "",
			size: 64,
			rotation: 0,
			aspectRatio: 1,
			borderRadius: 0,
			borderColor: "rgba(0, 0, 0, 0)",
			borderWidth: 0,
			shadowColor: "rgba(0, 0, 0, 0)",
			shadowWidth: 0,
		},
		basics: {
			name: store.fullName || "",
			headline: store.targetPosition || "",
			email: store.email || "",
			phone: store.phone || "",
			location: store.location || "",
			website: {
				url: store.portfolio || "",
				label: store.portfolio || "",
			},
			customFields: [
				...(store.linkedin
					? [
							{
								id: stableId("custom-field", "linkedin", store.linkedin),
								icon: "linkedin-logo",
								text: store.linkedin,
								link: store.linkedin,
							},
						]
					: []),
				...(store.github
					? [
							{
								id: stableId("custom-field", "github", store.github),
								icon: "github-logo",
								text: store.github,
								link: store.github,
							},
						]
					: []),
			],
		},
		summary: {
			title: store.cvLanguage === "vi" ? "Tóm tắt" : "Summary",
			icon: "article",
			columns: 1,
			hidden: (store.sectionVisibility?.summary === false) || !store.summary,
			content: toHtml(store.summary),
		},
		sections: {
			profiles: {
				title: store.cvLanguage === "vi" ? "Hồ sơ" : "Profiles",
				icon: "user",
				columns: 1,
				hidden: true, // we mapped linkedin/github to customFields in basics instead
				items: [],
			},
			experience: {
				title: store.cvLanguage === "vi" ? "Kinh nghiệm làm việc" : "Experience",
				icon: "briefcase",
				columns: 1,
				hidden: (store.sectionVisibility?.experience === false) || experienceItems.length === 0,
				items: experienceItems,
			},
			education: {
				title: store.cvLanguage === "vi" ? "Học vấn" : "Education",
				icon: "graduation-cap",
				columns: 1,
				hidden: (store.sectionVisibility?.education === false) || educationItems.length === 0,
				items: educationItems,
			},
			projects: {
				title: store.cvLanguage === "vi" ? "Dự án" : "Projects",
				icon: "folder",
				columns: 1,
				hidden: (store.sectionVisibility?.projects === false) || projectItems.length === 0,
				items: projectItems,
			},
			skills: {
				title: store.cvLanguage === "vi" ? "Kỹ năng" : "Skills",
				icon: "lightning",
				columns: 1,
				hidden: (store.sectionVisibility?.skills === false) || (store.technicalSkills.length === 0 && store.softSkills.length === 0 && store.tools.length === 0),
				items: [
					...(store.technicalSkills.length > 0
						? [
								{
									id: "skill-technical",
									hidden: false,
									icon: "",
									iconColor: "",
									name: "Technical",
									proficiency: "",
									level: 0,
									keywords: store.technicalSkills,
								},
							]
						: []),
					...(store.softSkills.length > 0
						? [
								{
									id: "skill-soft",
									hidden: false,
									icon: "",
									iconColor: "",
									name: "Soft Skills",
									proficiency: "",
									level: 0,
									keywords: store.softSkills,
								},
							]
						: []),
					...(store.tools.length > 0
						? [
								{
									id: "skill-tools",
									hidden: false,
									icon: "",
									iconColor: "",
									name: "Tools",
									proficiency: "",
									level: 0,
									keywords: store.tools,
								},
							]
						: []),
				],
			},
			languages: {
				title: store.cvLanguage === "vi" ? "Ngôn ngữ" : "Languages",
				icon: "globe",
				columns: 1,
				hidden: store.languages.length === 0, // Languages isn't in visibility toggle yet
				items: store.languages.map((lang, index) => ({
					id: stableId("language", index, lang),
					hidden: false,
					language: lang,
					fluency: "",
					level: 0,
				})),
			},
			interests: {
				title: "Interests",
				icon: "heart",
				columns: 1,
				hidden: true,
				items: [],
			},
			awards: {
				title: "Awards",
				icon: "medal",
				columns: 1,
				hidden: true,
				items: [],
			},
			certifications: {
				title: store.cvLanguage === "vi" ? "Chứng chỉ" : "Certifications",
				icon: "certificate",
				columns: 1,
				hidden: (store.sectionVisibility?.certifications === false) || certificationItems.length === 0,
				items: certificationItems,
			},
			publications: {
				title: "Publications",
				icon: "book",
				columns: 1,
				hidden: true,
				items: [],
			},
			volunteer: {
				title: "Volunteer",
				icon: "hand-heart",
				columns: 1,
				hidden: true,
				items: [],
			},
			references: {
				title: "References",
				icon: "users",
				columns: 1,
				hidden: true,
				items: [],
			},
		},
		customSections: [],
		metadata: {
			template: resolveTemplate(store.template),
			layout: {
				sidebarWidth: 30,
				pages: [
					{
						fullWidth: false,
						main: store.sectionOrder ? store.sectionOrder.filter(k => ["experience", "education", "projects"].includes(k)) : ["experience", "education", "projects"],
						sidebar: [...(store.sectionOrder ? store.sectionOrder.filter(k => ["summary", "skills", "certifications"].includes(k)) : ["summary", "skills", "certifications"]), "languages"],
					},
				],
			},
			page: {
				gapX: density.gap,
				gapY: density.gap,
				marginX: density.margin,
				marginY: density.margin,
				format: "a4",
				locale: store.cvLanguage === "vi" ? "vi-VN" : "en-US",
				hideLinkUnderline: false,
				hideIcons: false,
				hideSectionIcons: store.resumeHideSectionIcons ?? false,
			},
			design: {
				level: { icon: "star", type: "hidden" },
				colors: { primary: accentColor, text: "#334155", background: "#ffffff" },
			},
			typography: {
				body: { fontFamily: "Inter", fontWeights: ["400"], fontSize: fontScale.body, lineHeight: 1.5 },
				heading: { fontFamily: "Inter", fontWeights: ["700"], fontSize: fontScale.heading, lineHeight: 1.5 },
			},
			notes: "",
			styleRules: [],
		},
	};
}

export function adaptResumeDataToCanonical(resume: ResumeData): CanonicalCvDocument {
	return {
		language: resume.metadata.page.locale === "vi-VN" ? "vi" : "en",
		contact: {
			name: resume.basics.name || null,
			email: resume.basics.email || null,
			phone: resume.basics.phone || null,
			location: resume.basics.location || null,
			links: [
				...(resume.basics.website.url ? [{ label: resume.basics.website.label || "Website", url: resume.basics.website.url }] : []),
				...resume.basics.customFields.filter((f) => f.link).map((f) => ({ label: f.text || f.icon || "Link", url: f.link }))
			]
		},
		summary: htmlToBullets(resume.summary.content).join("\n"),
		education: resume.sections.education.items.map((edu) => ({
			school: edu.school,
			degree: edu.degree || null,
			field: edu.area || null,
			start: edu.period ? edu.period.split(" - ")[0] : null,
			end: edu.period && edu.period.includes(" - ") ? edu.period.split(" - ")[1] : null,
			gpa: edu.grade || null,
			highlights: htmlToBullets(edu.description)
		})),
		experience: resume.sections.experience.items.map((exp) => ({
			org: exp.company,
			role: exp.position || null,
			start: exp.period ? exp.period.split(" - ")[0] : null,
			end: exp.period && exp.period.includes(" - ") ? exp.period.split(" - ")[1] : null,
			location: exp.location || null,
			bullets: htmlToBullets(exp.description)
		})),
		projects: resume.sections.projects.items.map((proj) => {
			const bullets = htmlToBullets(proj.description);
			let role: string | null = null;
			let tech: string[] = [];
			const filteredBullets = bullets.filter((b) => {
				if (b.startsWith("Role: ")) {
					role = b.replace("Role: ", "");
					return false;
				}
				if (b.startsWith("Tools: ")) {
					tech = b.replace("Tools: ", "").split(",").map((s) => s.trim());
					return false;
				}
				return true;
			});
			return {
				name: proj.name,
				role,
				tech,
				bullets: filteredBullets,
				link: proj.website.url || null
			};
		}),
		skills: {
			technical: resume.sections.skills.items.find((i) => i.name === "Technical")?.keywords || [],
			soft: resume.sections.skills.items.find((i) => i.name === "Soft Skills")?.keywords || [],
			tools: resume.sections.skills.items.find((i) => i.name === "Tools")?.keywords || [],
			languages: resume.sections.languages.items.map((l) => l.language)
		},
		certifications: resume.sections.certifications.items.map((cert) => ({
			name: cert.title,
			issuer: cert.issuer || null,
			date: cert.date || null
		})),
		activities: []
	};
}

export function adaptCanonicalToResumeData(canonical: CanonicalCvDocument): ResumeData {
	return {
		picture: {
			hidden: true,
			url: "",
			size: 64,
			rotation: 0,
			aspectRatio: 1,
			borderRadius: 0,
			borderColor: "rgba(0, 0, 0, 0)",
			borderWidth: 0,
			shadowColor: "rgba(0, 0, 0, 0)",
			shadowWidth: 0,
		},
		basics: {
			name: canonical.contact.name || "",
			headline: "",
			email: canonical.contact.email || "",
			phone: canonical.contact.phone || "",
			location: canonical.contact.location || "",
			website: {
				url: canonical.contact.links[0]?.url || "",
				label: canonical.contact.links[0]?.label || "",
			},
			customFields: canonical.contact.links.slice(1).map((link, index) => ({
				id: stableId("canonical-link", index, link.label, link.url),
				icon: "link",
				text: link.label,
				link: link.url,
			})),
		},
		summary: {
			title: canonical.language === "vi" ? "Tóm tắt" : "Summary",
			icon: "article",
			columns: 1,
			hidden: !canonical.summary,
			content: toHtml(canonical.summary),
		},
		sections: {
			profiles: { title: "Profiles", icon: "user", columns: 1, hidden: true, items: [] },
			experience: {
				title: canonical.language === "vi" ? "Kinh nghiệm làm việc" : "Experience",
				icon: "briefcase",
				columns: 1,
				hidden: canonical.experience.length === 0,
				items: canonical.experience.map((exp, index) => ({
					id: stableId("canonical-experience", index, exp.org, exp.role),
					hidden: false,
					company: exp.org,
					position: exp.role || "",
					location: exp.location || "",
					period: [exp.start, exp.end].filter(Boolean).join(" - "),
					website: { url: "", label: "", inlineLink: false },
					description: toHtml(exp.bullets.join("\n\n")),
					roles: [],
				})),
			},
			education: {
				title: canonical.language === "vi" ? "Học vấn" : "Education",
				icon: "graduation-cap",
				columns: 1,
				hidden: canonical.education.length === 0,
				items: canonical.education.map((edu, index) => ({
					id: stableId("canonical-education", index, edu.school, edu.degree, edu.field),
					hidden: false,
					school: edu.school,
					degree: edu.degree || "",
					area: edu.field || "",
					grade: edu.gpa || "",
					location: "",
					period: [edu.start, edu.end].filter(Boolean).join(" - "),
					website: { url: "", label: "", inlineLink: false },
					description: toHtml(edu.highlights.join("\n\n")),
				})),
			},
			projects: {
				title: canonical.language === "vi" ? "Dự án" : "Projects",
				icon: "folder",
				columns: 1,
				hidden: canonical.projects.length === 0,
				items: canonical.projects.map((proj, index) => ({
					id: stableId("canonical-project", index, proj.name, proj.role),
					hidden: false,
					name: proj.name,
					period: "",
					website: { url: proj.link || "", label: proj.link || "", inlineLink: false },
					description: toHtml([
						proj.role ? `Role: ${proj.role}` : "",
						proj.tech && proj.tech.length > 0 ? `Tools: ${proj.tech.join(", ")}` : "",
						...proj.bullets
					].filter(Boolean).join("\n\n")),
				})),
			},
			skills: {
				title: canonical.language === "vi" ? "Kỹ năng" : "Skills",
				icon: "lightning",
				columns: 1,
				hidden: (!canonical.skills.technical || canonical.skills.technical.length === 0) && (!canonical.skills.soft || canonical.skills.soft.length === 0) && (!canonical.skills.tools || canonical.skills.tools.length === 0),
				items: [
					...(canonical.skills.technical && canonical.skills.technical.length > 0 ? [{ id: "skill-technical", hidden: false, icon: "", iconColor: "", name: "Technical", proficiency: "", level: 0, keywords: canonical.skills.technical }] : []),
					...(canonical.skills.soft && canonical.skills.soft.length > 0 ? [{ id: "skill-soft", hidden: false, icon: "", iconColor: "", name: "Soft Skills", proficiency: "", level: 0, keywords: canonical.skills.soft }] : []),
					...(canonical.skills.tools && canonical.skills.tools.length > 0 ? [{ id: "skill-tools", hidden: false, icon: "", iconColor: "", name: "Tools", proficiency: "", level: 0, keywords: canonical.skills.tools }] : []),
				]
			},
			languages: {
				title: canonical.language === "vi" ? "Ngoại ngữ" : "Languages",
				icon: "translate",
				columns: 1,
				hidden: !canonical.skills.languages || canonical.skills.languages.length === 0,
				items: (canonical.skills.languages || []).map((lang, index) => ({
					id: stableId("language", index, lang),
					hidden: false,
					language: lang,
					fluency: "",
					level: 0
				}))
			},
			interests: { title: "Interests", icon: "heart", columns: 1, hidden: true, items: [] },
			awards: { title: "Awards", icon: "medal", columns: 1, hidden: true, items: [] },
			certifications: {
				title: canonical.language === "vi" ? "Chứng chỉ" : "Certifications",
				icon: "certificate",
				columns: 1,
				hidden: canonical.certifications.length === 0,
				items: canonical.certifications.map((cert, index) => ({
					id: stableId("canonical-certification", index, cert.name, cert.issuer),
					hidden: false,
					title: cert.name,
					issuer: cert.issuer || "",
					date: cert.date || "",
					website: { url: "", label: "", inlineLink: false },
					description: ""
				}))
			},
			publications: { title: "Publications", icon: "book", columns: 1, hidden: true, items: [] },
			volunteer: { title: "Volunteer", icon: "hand-heart", columns: 1, hidden: true, items: [] },
			references: { title: "References", icon: "users", columns: 1, hidden: true, items: [] },
		},
		customSections: [],
		metadata: {
			template: "onyx",
			layout: {
				sidebarWidth: 30,
				pages: [
					{
						fullWidth: false,
						main: ["experience", "education", "projects"],
						sidebar: ["summary", "skills", "languages", "certifications"],
					},
				],
			},
			page: { gapX: 16, gapY: 16, marginX: 24, marginY: 24, format: "a4", locale: canonical.language === "vi" ? "vi-VN" : "en-US", hideLinkUnderline: false, hideIcons: false, hideSectionIcons: false },
			design: { level: { icon: "star", type: "hidden" }, colors: { primary: "#0f172a", text: "#334155", background: "#ffffff" } },
			typography: { body: { fontFamily: "Inter", fontWeights: ["400"], fontSize: 11, lineHeight: 1.5 }, heading: { fontFamily: "Inter", fontWeights: ["700"], fontSize: 14, lineHeight: 1.5 } },
			notes: "",
			styleRules: [],
		}
	};
}
