import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="page-enter placeholder-page">
      <p className="error-number">404</p>
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.description")}</p>
      <Link className="text-link" to="/">
        <ArrowLeft size={17} /> {t("common.backHome")}
      </Link>
    </section>
  );
}
