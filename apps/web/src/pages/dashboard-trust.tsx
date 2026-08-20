import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../lib/api";
import { supabase } from "../lib/supabase";

type Badge = { status: string; months_active: number; verified_order_count: number; on_time_rate: number | null; dispute_rate: number | null; badge_image_url: string; widget_embed_code: string };
export function DashboardTrustPage() {
  const navigate = useNavigate();
  const [badge, setBadge] = useState<Badge | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return navigate("/login?return=/dashboard/trust", { replace: true });
      try {
        const me = await apiRequest<{ data: { id: string } }>("/v1/sellers/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await apiRequest<{ data: Badge }>(`/v1/sellers/${me.data.id}/badge`);
        setBadge(result.data);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 404) return navigate("/register", { replace: true });
        setError(caught instanceof Error ? caught.message : "Unable to load badge");
      }
    })();
  }, [navigate]);
  return <main className="page-enter"><h1>Your trust badge</h1>{badge && <section><h2>{badge.status.replace("_", " ")}</h2><p>{badge.verified_order_count} verified orders · {badge.months_active} months active</p><p>On-time delivery: {badge.on_time_rate === null ? "—" : `${Math.round(badge.on_time_rate * 100)}%`} · Disputes: {badge.dispute_rate === null ? "—" : `${(badge.dispute_rate * 100).toFixed(1)}%`}</p><img src={badge.badge_image_url} alt="Mekha verified seller badge" width={600} /><p><a href={badge.badge_image_url} download>Download badge PNG</a></p><textarea readOnly value={badge.widget_embed_code} /></section>}{error && <p role="alert">{error}</p>}</main>;
}
