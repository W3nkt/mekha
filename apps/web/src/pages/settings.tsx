import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Download, LogOut, ShieldCheck, Users } from "lucide-react";

import { ApiError, apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";
import { ConfirmDialog } from "../components/ConfirmDialog";

const planLabel = { free: "Free", standard: "Standard", pro: "Pro" } as const;

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const profile = useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) {
        navigate("/login?return=/dashboard/settings");
        throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      }
      return apiRequest<{
        data: { business_name: string; business_name_lao: string; subscription_plan: keyof typeof planLabel };
      }>("/v1/sellers/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
    },
  });

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    // Sellers' cached queries (dashboard profile, bottom nav avatar, etc.) must
    // be purged here, or they keep rendering the logged-in state after sign-out.
    queryClient.clear();
    setConfirmLogoutOpen(false);
    navigate("/");
  }

  return (
    <div className="page-enter dashboard-page">
      <header className="profile-identity">
        <div className="profile-name">
          <p className="eyebrow">Seller OS</p>
          <h1>ຕັ້ງຄ່າ</h1>
        </div>
      </header>

      {profile.data && (
        <section className="dashboard-section">
          <p className="eyebrow">ບັນຊີ</p>
          <p>{profile.data.data.business_name_lao || profile.data.data.business_name}</p>
          <p className="muted-copy">ແພັກເກັດ: {planLabel[profile.data.data.subscription_plan]}</p>
        </section>
      )}

      <section className="dashboard-section settings-links">
        <Link to="/dashboard">
          <ShieldCheck size={18} /> ໂປຣໄຟລ໌ຮ້ານຄ້າ
        </Link>
        <Link to="/dashboard/customers">
          <Users size={18} /> ລູກຄ້າ
        </Link>
        <Link to="/dashboard/settings/export">
          <Download size={18} /> ດາວໂຫລດຂໍ້ມູນ
        </Link>
      </section>

      <button
        type="button"
        className="mk-button mk-button--danger settings-logout"
        onClick={() => setConfirmLogoutOpen(true)}
      >
        <LogOut size={18} /> ອອກຈາກລະບົບ
      </button>

      <ConfirmDialog
        open={confirmLogoutOpen}
        title="ອອກຈາກລະບົບ?"
        description="ທ່ານຈະຕ້ອງເຂົ້າສູ່ລະບົບໃໝ່ອີກຄັ້ງເພື່ອຈັດການຮ້ານຄ້າຂອງທ່ານ."
        confirmLabel="ອອກຈາກລະບົບ"
        cancelLabel="ຍົກເລີກ"
        tone="danger"
        onConfirm={() => void signOut()}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </div>
  );
}
