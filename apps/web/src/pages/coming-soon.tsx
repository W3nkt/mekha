import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ComingSoonPage({ section }: { section: string }) {
  const { t } = useTranslation();
  return (
    <section className="page-enter placeholder-page">
      <Construction size={28} />
      <p className="eyebrow">{t("common.comingSoon")}</p>
      <h1>{t(`nav.${section}`)}</h1>
    </section>
  );
}
