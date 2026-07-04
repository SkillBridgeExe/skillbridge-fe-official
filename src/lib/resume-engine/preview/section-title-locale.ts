import type { SectionTitleResolver } from "@resume-engine/pdf/section-title";
import { useEffect, useReducer } from "react";

// DIVERGENCE (README-VENDOR.txt): RR resolves section titles through Lingui
// (@lingui/core + .po catalogs) via apps/web/src/libs/resume/section-title.ts
// and section-title-locale.ts. Lingui is NOT wired in RE-V0 (full i18n lands
// in RE-V2). This stub hardcodes an en/vi map for the smoke page; unknown
// locales fall through to the English `defaultEnglishTitle` pdf/section-title.ts
// already computes.

type SectionKey =
	| "summary"
	| "profiles"
	| "experience"
	| "education"
	| "projects"
	| "skills"
	| "languages"
	| "interests"
	| "awards"
	| "certifications"
	| "publications"
	| "volunteer"
	| "references"
	| "cover-letter";

const viTitles: Record<SectionKey, string> = {
	summary: "Giới thiệu",
	profiles: "Hồ sơ",
	experience: "Kinh nghiệm",
	education: "Học vấn",
	projects: "Dự án",
	skills: "Kỹ năng",
	languages: "Ngôn ngữ",
	interests: "Sở thích",
	awards: "Giải thưởng",
	certifications: "Chứng chỉ",
	publications: "Xuất bản",
	volunteer: "Tình nguyện",
	references: "Người tham chiếu",
	"cover-letter": "Thư xin việc",
};

const titlesByLocale: Record<string, Partial<Record<SectionKey, string>>> = {
	vi: viTitles,
};

export const createSectionTitleResolver = (locale: string): SectionTitleResolver => {
	const table = titlesByLocale[locale.split("-")[0] ?? locale];

	return ({ sectionId, sectionKind, customSectionType, defaultEnglishTitle }) => {
		const key = (sectionKind === "custom" ? customSectionType : sectionId) as SectionKey | undefined;
		const translated = key ? table?.[key] : undefined;

		return translated ?? defaultEnglishTitle ?? sectionId;
	};
};

export const createSectionTitleResolverForLocale = async (locale: string): Promise<SectionTitleResolver> =>
	createSectionTitleResolver(locale);

export const useSectionTitleResolver = (locale?: string): SectionTitleResolver | null => {
	const [resolver, dispatchResolver] = useReducer(
		(_state: SectionTitleResolver | null, nextResolver: SectionTitleResolver | null) => nextResolver,
		null,
	);

	useEffect(() => {
		if (!locale) {
			dispatchResolver(null);
			return;
		}

		dispatchResolver(createSectionTitleResolver(locale));
	}, [locale]);

	return resolver;
};
