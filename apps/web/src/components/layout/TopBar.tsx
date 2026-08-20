import { Languages, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const languages = ["lo", "th", "en"] as const;

export function TopBar() {
  const { i18n, t } = useTranslation();
  const current = languages.includes(
    i18n.resolvedLanguage as (typeof languages)[number],
  )
    ? (i18n.resolvedLanguage as (typeof languages)[number])
    : "lo";
  const changeLanguage = () => {
    const next = languages[(languages.indexOf(current) + 1) % languages.length];
    void i18n.changeLanguage(next);
  };

  return (
    <header className="top-bar">
      <Link className="brand-lockup" to="/" aria-label={t("app.name")}>
        <span className="brand-mark" aria-hidden="true">
          <ShieldCheck size={19} />
        </span>
        <span>{t("app.name")}</span>
      </Link>
      <button
        className="language-button"
        onClick={changeLanguage}
        type="button"
        aria-label={t("common.language")}
      >
        <Languages size={18} />
        <span>{current.toUpperCase()}</span>
      </button>
    </header>
  );
}
