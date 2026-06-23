export type AssistantLocale = "vi" | "en";

/**
 * The Companion assistant converses with the USER in the UI language, but writes CV text in the CV's
 * OWN language — so a Vietnamese user building an English CV is asked in Vietnamese yet gets English
 * bullets that fit the (English) CV.
 *
 * @param uiLanguage  the app UI language (i18n.language; may be a tag like "vi-VN")
 * @param cvLanguage  the CV's language (cvLanguage, set from the scanned doc.language)
 */
export function assistantLocales(opts: {
  uiLanguage: string;
  cvLanguage: string;
}): { conversation: AssistantLocale; output: AssistantLocale } {
  return {
    conversation: opts.uiLanguage.startsWith("vi") ? "vi" : "en",
    output: opts.cvLanguage.startsWith("vi") ? "vi" : "en",
  };
}
