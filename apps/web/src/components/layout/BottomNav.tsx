import {
  BadgeDollarSign,
  Boxes,
  PackageCheck,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import type { SellerDashboardProfile } from "@mekha/types";

import { ApiError, apiRequest } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { SellerAvatar } from "../SellerAvatar";

const items = [
  { to: "/dashboard/orders", label: "nav.orders", Icon: PackageCheck },
  { to: "/dashboard/products", label: "nav.products", Icon: Boxes },
  { to: "/dashboard/finance", label: "nav.finance", Icon: BadgeDollarSign },
  { to: "/dashboard/trust", label: "nav.trust", Icon: ShieldCheck },
] as const;

export function BottomNav() {
  const { t } = useTranslation();

  const profile = useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: async () => {
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      if (!session) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{ data: SellerDashboardProfile }>("/v1/sellers/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    },
    retry: false,
  });

  const loggedIn = !!profile.data;

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
      <NavLink
        to="/dashboard/settings"
        className={({ isActive }) =>
          `nav-item${isActive ? " is-active" : ""}`
        }
      >
        {loggedIn ? (
          <span className="nav-avatar">
            <SellerAvatar logoUrl={profile.data?.data.logo_url} iconSize={14} />
          </span>
        ) : (
          <Settings size={21} strokeWidth={1.8} />
        )}
        <span>{t("nav.settings")}</span>
      </NavLink>
    </nav>
  );
}
