type WebsiteDisplay = {
	url: string;
	label?: string | undefined;
};

type CustomFieldLink = {
	link?: string | undefined;
};

export const breakPdfWord = (text: string | undefined): string => {
	if (!text) return "";
	return text.replace(/([@./\-_,=])/g, "$1\u200B");
};

export const getWebsiteDisplayText = (website: WebsiteDisplay): string => {
	const label = website.label?.trim();

	return breakPdfWord(label || website.url);
};

export const getCustomFieldLinkUrl = (field: CustomFieldLink): string | undefined => {
	const link = field.link?.trim();

	return link || undefined;
};
