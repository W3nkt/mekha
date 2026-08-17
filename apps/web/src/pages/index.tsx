import { ArrowRight, PackagePlus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="page-enter home-page">
      <section className="home-intro">
        <div className="eyebrow">
          <Sparkles size={15} /> {t("home.greeting")}
        </div>
        <h1>{t("home.headline")}</h1>
        <p>{t("home.description")}</p>
        <Link to="/login" className="primary-link">
          {t("home.primaryAction")} <ArrowRight size={18} />
        </Link>
      </section>

      <section className="today-section" aria-labelledby="today-title">
        <div className="section-heading">
          <h2 id="today-title">{t("home.today")}</h2>
          <span>0</span>
        </div>
        <div className="empty-workspace">
          <span className="empty-icon">
            <PackagePlus size={25} />
          </span>
          <div>
            <h3>{t("home.emptyTitle")}</h3>
            <p>{t("home.emptyDescription")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
