import {
  BadgeDollarSign,
  Boxes,
  PackageCheck,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/orders", label: "nav.orders", Icon: PackageCheck },
  { to: "/products", label: "nav.products", Icon: Boxes },
  { to: "/finance", label: "nav.finance", Icon: BadgeDollarSign },
  { to: "/trust", label: "nav.trust", Icon: ShieldCheck },
  { to: "/settings", label: "nav.settings", Icon: Settings },
] as const;

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `nav-item${isActive ? " is-active" : ""}`
          }
        >
          <Icon size={21} strokeWidth={1.8} />
          <span>{t(label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
