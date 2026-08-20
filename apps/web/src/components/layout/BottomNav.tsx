import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Boxes,
  CircleUserRound,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import type { SellerDashboardProfile } from "@mekha/types";

import { ApiError, apiRequest } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { SellerAvatar } from "../SellerAvatar";

const sellerItems = [
  { to: "/dashboard/orders", label: "nav.orders", Icon: PackageCheck, activePaths: ["/dashboard/orders"] },
  { to: "/dashboard/products", label: "nav.products", Icon: Boxes, activePaths: ["/dashboard/products"] },
  { to: "/dashboard/finance", label: "nav.finance", Icon: BadgeDollarSign, activePaths: ["/dashboard/finance"] },
  { to: "/dashboard/trust", label: "nav.trust", Icon: ShieldCheck, activePaths: ["/dashboard/trust"] },
] as const;

const guestItems = [
  { to: "/search", label: "nav.verify", Icon: ShieldCheck, activePaths: ["/", "/search", "/seller"] },
  { to: "/track", label: "nav.track", Icon: PackageSearch, activePaths: ["/track"] },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Resolved from the local Supabase session (near-instant, no network round trip) rather
  // than from the seller profile fetch below, so the nav doesn't flash the guest layout
  // for already-logged-in sellers while that slower API call is still in flight.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      setHasSession(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(!!data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const profile = useQuery({
    queryKey: ["seller-dashboard"],
    enabled: hasSession === true,
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

  const loggedIn = hasSession ?? false;
  const items = loggedIn ? sellerItems : guestItems;

  function isItemActive(activePaths: readonly string[]) {
    return activePaths.some((path) =>
      path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`),
    );
  }

  return (
    <nav
      className={`bottom-nav${loggedIn ? "" : " bottom-nav--guest"}`}
      aria-label="Primary"
    >
      {items.map(({ to, label, Icon, activePaths }) => {
        const active = isItemActive(activePaths);
        return (
          <NavLink
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`nav-item${active ? " is-active" : ""}`}
          >
            <Icon size={21} strokeWidth={1.8} />
            <span>{t(label)}</span>
          </NavLink>
        );
      })}
      {loggedIn ? (
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            `nav-item${isActive ? " is-active" : ""}`
          }
        >
          <span className="nav-avatar">
            <SellerAvatar logoUrl={profile.data?.data.logo_url} iconSize={14} />
          </span>
          <span>{t("nav.settings")}</span>
        </NavLink>
      ) : (
        <NavLink
          to="/login"
          className={({ isActive }) =>
            `nav-item${isActive ? " is-active" : ""}`
          }
        >
          <CircleUserRound size={22} strokeWidth={1.8} />
          <span>{t("nav.profile")}</span>
        </NavLink>
      )}
    </nav>
  );
}
