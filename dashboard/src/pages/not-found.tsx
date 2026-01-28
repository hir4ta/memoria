import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function NotFoundPage() {
  const { t } = useTranslation("errors");

  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold mb-4">{t("notFound.title")}</h1>
      <p className="text-muted-foreground mb-4">{t("notFound.message")}</p>
      <Link to="/" className="text-primary underline">
        {t("notFound.backToHome")}
      </Link>
    </div>
  );
}
