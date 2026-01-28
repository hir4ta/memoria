import { useAtom } from "jotai";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { type Language, languageAtom } from "@/i18n/atoms";
import { Button } from "./ui/button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useAtom(languageAtom);

  // Sync i18n with jotai atom on mount
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [i18n, language]);

  const toggleLanguage = () => {
    const newLang: Language = language === "en" ? "ja" : "en";
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="font-mono text-xs px-2"
    >
      {language === "en" ? "EN" : "JA"}
    </Button>
  );
}
