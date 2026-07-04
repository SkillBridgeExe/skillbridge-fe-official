import type { ResumeData } from "@resume-engine/schema/resume/data";
import type { Template } from "@resume-engine/schema/templates";
import { useMemo } from "react";
import { createResumePdfBlob as createPdfBlob } from "@resume-engine/pdf/browser";
import { ResumeDocument } from "@resume-engine/pdf/document";
import { createSectionTitleResolverForLocale, useSectionTitleResolver } from "./section-title-locale";

export const useLocalizedResumeDocument = (data?: ResumeData, template?: Template) => {
	const sectionTitleResolver = useSectionTitleResolver(data?.metadata.page.locale);

	return useMemo(() => {
		if (!data || !sectionTitleResolver) return null;

		return (
			<ResumeDocument
				data={data}
				template={template ?? data.metadata.template}
				resolveSectionTitle={sectionTitleResolver}
			/>
		);
	}, [data, template, sectionTitleResolver]);
};

export const createResumePdfBlob = async (data: ResumeData, template?: Template) => {
	const sectionTitleResolver = await createSectionTitleResolverForLocale(data.metadata.page.locale);

	return createPdfBlob({
		data,
		template,
		resolveSectionTitle: sectionTitleResolver,
	});
};
