import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// English translations
import enCommon from "./locales/en/common.json";
import enDecisions from "./locales/en/decisions.json";
import enErrors from "./locales/en/errors.json";
import enGraph from "./locales/en/graph.json";
import enLayout from "./locales/en/layout.json";
import enPatterns from "./locales/en/patterns.json";
import enRules from "./locales/en/rules.json";
import enSessions from "./locales/en/sessions.json";
import enStats from "./locales/en/stats.json";

// Japanese translations
import jaCommon from "./locales/ja/common.json";
import jaDecisions from "./locales/ja/decisions.json";
import jaErrors from "./locales/ja/errors.json";
import jaGraph from "./locales/ja/graph.json";
import jaLayout from "./locales/ja/layout.json";
import jaPatterns from "./locales/ja/patterns.json";
import jaRules from "./locales/ja/rules.json";
import jaSessions from "./locales/ja/sessions.json";
import jaStats from "./locales/ja/stats.json";

const resources = {
  en: {
    common: enCommon,
    layout: enLayout,
    sessions: enSessions,
    decisions: enDecisions,
    rules: enRules,
    patterns: enPatterns,
    stats: enStats,
    graph: enGraph,
    errors: enErrors,
  },
  ja: {
    common: jaCommon,
    layout: jaLayout,
    sessions: jaSessions,
    decisions: jaDecisions,
    rules: jaRules,
    patterns: jaPatterns,
    stats: jaStats,
    graph: jaGraph,
    errors: jaErrors,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: [
      "common",
      "layout",
      "sessions",
      "decisions",
      "rules",
      "patterns",
      "stats",
      "graph",
      "errors",
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "memoria-lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
