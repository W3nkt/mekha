import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "../i18n/en.json";
import lo from "../i18n/lo.json";
import th from "../i18n/th.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      lo: { translation: lo },
      th: { translation: th },
      en: { translation: en },
    },
    fallbackLng: "lo",
    supportedLngs: ["lo", "th", "en"],
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "mekha-language",
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
