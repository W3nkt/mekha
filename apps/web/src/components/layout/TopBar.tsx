import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import logo from "../../assets/logo-mark.png";

const languages = ["lo", "th", "en"] as const;
const languageNames: Record<(typeof languages)[number], string> = {
  lo: "ລາວ",
  th: "ไทย",
  en: "English",
};

export function TopBar() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = languages.includes(
    i18n.resolvedLanguage as (typeof languages)[number],
  )
    ? (i18n.resolvedLanguage as (typeof languages)[number])
    : "lo";

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  function selectLanguage(lng: (typeof languages)[number]) {
    void i18n.changeLanguage(lng);
    setOpen(false);
  }

  return (
    <header className="top-bar">
      <Link className="brand-lockup" to="/" aria-label={t("app.name")}>
        <img className="brand-mark" src={logo} alt="" aria-hidden="true" />
        <span>{t("app.name")}</span>
      </Link>
      <div className="language-menu" ref={menuRef}>
        <button
          className="language-button"
          onClick={() => setOpen((value) => !value)}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${t("common.language")}: ${languageNames[current]} (${current.toUpperCase()})`}
        >
          <Languages size={18} />
          <span>{current.toUpperCase()}</span>
        </button>
        {open && (
          <ul className="language-menu__list" role="listbox">
            {languages.map((lng) => (
              <li key={lng}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lng === current}
                  className={`language-menu__item${lng === current ? " is-active" : ""}`}
                  onClick={() => selectLanguage(lng)}
                >
                  <span>{languageNames[lng]}</span>
                  {lng === current && <Check size={16} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}
