import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";

import { apiDownload, apiRequest, ApiError } from "../lib/api";
import { supabase } from "../lib/supabase";

const exportSections = [
  { type: "orders", label: "ຄຳສັ່ງທັງໝົດ", withDateRange: true },
  { type: "monthly", label: "ສະຫຼຸບລາຍເດືອນ", withDateRange: true },
  { type: "customers", label: "ລາຍຊື່ລູກຄ້າ", withDateRange: false },
] as const;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DataExportPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function accessToken() {
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (!session) {
      navigate(
        `/login?return=${encodeURIComponent("/dashboard/settings/export")}`,
        { replace: true },
      );
      return null;
    }
    return session.access_token;
  }

  async function download(type: (typeof exportSections)[number]["type"]) {
    setError("");
    setDownloading(type);
    try {
      const token = await accessToken();
      if (!token) return;
      const me = await apiRequest<{ data: { id: string } }>("/v1/sellers/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const params = new URLSearchParams({ type });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { blob, filename } = await apiDownload(
        `/v1/sellers/${me.data.id}/export?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      triggerDownload(blob, filename ?? `khaidee-${type}.csv`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ດາວໂຫລດບໍ່ສຳເລັດ");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="page-enter export-page">
      <header>
        <p className="eyebrow">Settings</p>
        <h1>ດາວໂຫລດຂໍ້ມູນ</h1>
      </header>

      <label className="export-date-range">
        <span className="mk-field__label">ຊ່ວງວັນທີ</span>
        <div>
          <input
            className="mk-input"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span>→</span>
          <input
            className="mk-input"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {exportSections.map((section) => (
        <section className="export-section" key={section.type}>
          <h2>{section.label}</h2>
          <button
            className="mk-button mk-button--secondary"
            type="button"
            disabled={downloading === section.type}
            onClick={() => void download(section.type)}
          >
            <Download size={16} />{" "}
            {downloading === section.type ? "ກຳລັງດາວໂຫລດ…" : "ດາວໂຫລດ CSV"}
          </button>
        </section>
      ))}
    </div>
  );
}
