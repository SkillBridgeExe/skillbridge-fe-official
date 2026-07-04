import type { ResumeData } from "@resume-engine/schema/resume/data";
import type { ReactNode } from "react";
import type { SectionTitleResolver } from "./section-title";
import { createContext, useContext, useMemo } from "react";
import { isRTL } from "@resume-engine/utils/locale";

type RenderContextValue = ResumeData & {
	resolveSectionTitle?: SectionTitleResolver | undefined;
	rtl: boolean;
};

const RenderContext = createContext<RenderContextValue | null>(null);

export type RenderProviderProps = {
	data: ResumeData;
	resolveSectionTitle?: SectionTitleResolver | undefined;
	children: ReactNode;
};

export const RenderProvider = ({ data, resolveSectionTitle, children }: RenderProviderProps) => {
	const rtl = isRTL(data.metadata.page.locale);
	const contextValue = useMemo<RenderContextValue>(
		() => ({ ...data, resolveSectionTitle, rtl }),
		[data, resolveSectionTitle, rtl],
	);

	return <RenderContext.Provider value={contextValue}>{children}</RenderContext.Provider>;
};

export const useRender = (): RenderContextValue => {
	const context = useContext(RenderContext);

	if (!context) throw new Error("useRender must be called inside a <RenderProvider>.");

	return context;
};
