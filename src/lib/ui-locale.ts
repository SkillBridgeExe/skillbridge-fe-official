/**
 * Current UI locale reduced to the two languages the review feedback supports.
 *
 * Reads the `<html lang>` attribute (kept in sync with i18next in `src/i18n`) rather than
 * importing the i18n singleton — the singleton's init side effect breaks non-React test suites.
 * Falls back to "en" when no locale is set (e.g. in a test/SSR context).
 */
export function uiFeedbackLang(): "vi" | "en" {
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "";
  return lang.split("-")[0] === "vi" ? "vi" : "en";
}
