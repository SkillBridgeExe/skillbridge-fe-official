import type { Style } from "@react-pdf/types";

export type TemplatePlacement = "main" | "sidebar";

export type StyleInput = Style | Style[] | null | undefined;

type LinkStyleOptions = {
	hideUnderline?: boolean;
};

export const composeStyles = (...styles: StyleInput[]): Style[] => {
	return styles.flatMap((style) => {
		if (!style) return [];
		if (Array.isArray(style)) return style.filter(Boolean);

		return [style];
	});
};

const linkUnderlineStyle = { textDecoration: "underline" } satisfies Style;
const linkNoUnderlineStyle = { textDecoration: "none" } satisfies Style;

const resolveLinkDecorationStyle = ({ hideUnderline = false }: LinkStyleOptions = {}) =>
	hideUnderline ? linkNoUnderlineStyle : linkUnderlineStyle;

export const composeLinkStyles = (options: LinkStyleOptions = {}, ...styles: StyleInput[]): Style[] =>
	composeStyles(...styles, resolveLinkDecorationStyle(options));

export const mergeStyles = (...styles: StyleInput[]): Style => Object.assign({}, ...composeStyles(...styles));

export const mergeLinkStyles = (options: LinkStyleOptions = {}, ...styles: StyleInput[]): Style =>
	mergeStyles(...styles, resolveLinkDecorationStyle(options));

export const headerNameLineHeight = 1.3;

export type ResolvePlacementColorOptions = {
	placement: TemplatePlacement;
	defaultForeground: string;
	sidebarForeground?: string | undefined;
};

export const resolvePlacementColor = ({
	placement,
	defaultForeground,
	sidebarForeground,
}: ResolvePlacementColorOptions) => {
	if (placement === "sidebar" && sidebarForeground) return sidebarForeground;

	return defaultForeground;
};

export type ResolveDividerStylesOptions = {
	dividerStyle?: "none" | "line" | "accent" | "subtle";
	accentColor: string;
	textColor: string;
	position?: "top" | "bottom";
};

export const resolveDividerStyles = ({ dividerStyle, accentColor, textColor, position = "bottom" }: ResolveDividerStylesOptions): Style => {
	const borderProp = position === "bottom" ? "borderBottomWidth" : "borderTopWidth";
	const borderColorProp = position === "bottom" ? "borderBottomColor" : "borderTopColor";

	switch (dividerStyle) {
		case "none":
			return { [borderProp]: 0 } as Style;
		case "accent":
			return { [borderProp]: 2, [borderColorProp]: accentColor } as Style;
		case "subtle":
			return { [borderProp]: 1, [borderColorProp]: textColor } as Style;
		case "line":
		default:
			return { [borderProp]: 1, [borderColorProp]: accentColor } as Style;
	}
};
