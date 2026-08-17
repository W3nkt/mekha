import { ArrowRight, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LoginPage() {
  const { t } = useTranslation();

  return (
    <section className="page-enter login-page">
      <div className="login-symbol">
        <LockKeyhole size={26} />
      </div>
      <h1>{t("auth.title")}</h1>
      <p>{t("auth.description")}</p>
      <form className="phone-form" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="phone">{t("auth.country")}</label>
        <div className="phone-control">
          <span>+856</span>
          <input
            id="phone"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t("auth.phonePlaceholder")}
          />
        </div>
        <button type="submit">
          {t("auth.continue")} <ArrowRight size={18} />
        </button>
      </form>
    </section>
  );
}
