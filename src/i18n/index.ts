import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en";
import vi from "./locales/vi";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en, vi },
    fallbackLng: "en",
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "skillbridge-lang",
    },
    interpolation: { escapeValue: false },
  });

// Đồng bộ thẻ <html lang> ngay lập tức và theo dõi thay đổi sau đó
if (i18n.language) {
  const baseLang = i18n.language.split("-")[0];
  document.documentElement.lang = baseLang;
}

i18n.on("languageChanged", (lng) => {
  const baseLang = lng.split("-")[0];
  document.documentElement.lang = baseLang;
});

export default i18n;
