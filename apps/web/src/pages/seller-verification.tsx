import { Check, FileUp, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { VerificationType } from "@mekha/types";
import { apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";

type Status = {
  id: string;
  verification_type: VerificationType;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
};
type Item = {
  type: VerificationType;
  label: string;
  hint: string;
  required?: boolean;
};
const items: Item[] = [
  {
    type: "identity",
    label: "ບັດປະຈຳຕົວ / ໜັງສືຜ່ານແດນ",
    hint: "ເອກະສານຢືນຢັນຕົວຕົນ",
    required: true,
  },
  {
    type: "business_registration",
    label: "ໃບທະບຽນທຸລະກິດ",
    hint: "ຖ້າຮ້ານຈົດທະບຽນ",
  },
  {
    type: "e_trust",
    label: "ຂໍ້ມູນ E-Trust",
    hint: "ໝາຍເລກ ຫຼື screenshot (ຖ້າມີ)",
  },
  {
    type: "social_account",
    label: "ບັນຊີໂຊຊຽນ",
    hint: "ໜ້າ Facebook ຫຼື TikTok",
  },
  {
    type: "payment_identity",
    label: "ຂໍ້ມູນການຈ່າຍເງິນ",
    hint: "QR ຫຼື ບັນຊີທະນາຄານ",
  },
];

const hashFile = async (file: File) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export function SellerVerificationPage() {
  const navigate = useNavigate();
  const [sellerId, setSellerId] = useState("");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function accessToken() {
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (!session) navigate("/register");
    return session?.access_token ?? null;
  }
  async function refresh(id: string, token: string) {
    const response = await apiRequest<{ data: Status[] }>(
      `/v1/sellers/${id}/verifications`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setStatuses(response.data);
  }
  useEffect(() => {
    void (async () => {
      const token = await accessToken();
      if (!token) return;
      try {
        const me = await apiRequest<{ data: { id: string } }>(
          "/v1/sellers/me",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setSellerId(me.data.id);
        await refresh(me.data.id, token);
      } catch {
        setError("ບໍ່ສາມາດໂຫລດຂໍ້ມູນຮ້ານໄດ້");
      }
    })();
  }, []);

  async function upload(item: Item, file?: File) {
    if (!file || !sellerId || !supabase) return;
    if (file.size > 10 * 1024 * 1024) return setError("ໄຟລ໌ໃຫຍ່ເກີນ 10MB");
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type))
      return setError("ຮັບສະເພາະ JPG, PNG ແລະ PDF");
    setError("");
    setProgress((value) => ({ ...value, [item.type]: "ກຳລັງຄຳນວນລາຍນິ້ວມື…" }));
    try {
      const [fileHash, token] = await Promise.all([
        hashFile(file),
        accessToken(),
      ]);
      if (!token) return;
      const signed = await apiRequest<{ path: string; token: string }>(
        `/v1/sellers/${sellerId}/verification-upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            filename: file.name,
            mime_type: file.type,
            verification_type: item.type,
          }),
        },
      );
      setProgress((value) => ({ ...value, [item.type]: "ກຳລັງອັບໂຫລດ…" }));
      const uploaded = await supabase.storage
        .from("verification-docs")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (uploaded.error) throw uploaded.error;
      await apiRequest(`/v1/sellers/${sellerId}/verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          verification_type: item.type,
          document_path: signed.path,
          file_hash: fileHash,
        }),
      });
      setProgress((value) => ({ ...value, [item.type]: "ອັບໂຫລດສຳເລັດ" }));
      await refresh(sellerId, token);
    } catch {
      setProgress((value) => ({ ...value, [item.type]: "" }));
      setError("ອັບໂຫລດບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    }
  }
  const latest = (type: VerificationType) =>
    statuses.find((status) => status.verification_type === type);
  const statusText = (status: Status) =>
    status.status === "pending"
      ? "ກຳລັງລໍຖ້າກວດສອບ"
      : status.status === "approved"
        ? "ໄດ້ຮັບການກວດສອບ"
        : status.status === "rejected"
          ? `ຖືກປະຕິເສດ${status.reviewer_notes ? ` — ${status.reviewer_notes}` : ""}`
          : `ຕ້ອງການຂໍ້ມູນເພີ່ມ${status.reviewer_notes ? ` — ${status.reviewer_notes}` : ""}`;

  return (
    <section className="verification-workspace page-enter">
      <header>
        <div className="verification-mark">
          <ShieldCheck />
        </div>
        <div>
          <p className="eyebrow">LAOTRUST VERIFICATION</p>
          <h1>ສົ່ງເອກະສານຢືນຢັນ</h1>
          <p>ເອກະສານຖືກເກັບແບບສ່ວນຕົວ ແລະ ມີພຽງທີມກວດສອບທີ່ເຂົ້າເຖິງໄດ້.</p>
        </div>
      </header>
      <div className="verification-list">
        {items.map((item) => {
          const state = latest(item.type);
          return (
            <div className="verification-row" key={item.type}>
              <div>
                <strong>
                  {item.label}
                  {item.required && " *"}
                </strong>
                <span>{item.hint}</span>
                {state && (
                  <small
                    className={`verification-status status-${state.status}`}
                  >
                    {statusText(state)}
                  </small>
                )}
              </div>
              <label className="upload-control">
                {progress[item.type] === "ອັບໂຫລດສຳເລັດ" ? (
                  <Check size={18} />
                ) : (
                  <FileUp size={18} />
                )}
                <span>
                  {progress[item.type] ||
                    (state ? "ອັບໂຫລດໃໝ່" : "ອັບໂຫລດໄຟລ໌")}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf,.pdf"
                  onChange={(event) => {
                    void upload(item, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <strong>ທີມງານ LaoTrust ຈະກວດສອບພາຍໃນ 1–3 ວັນທຳການ</strong>
        <span>JPG, PNG ຫຼື PDF · ສູງສຸດ 10MB ຕໍ່ໄຟລ໌</span>
      </footer>
    </section>
  );
}
