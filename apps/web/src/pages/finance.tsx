import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Download, FileUp } from "lucide-react";
import { Button } from "@mekha/ui";
import type { CourierName } from "@mekha/types";

import { ApiError, apiRequest } from "../lib/api";
import { supabase } from "../lib/supabase";

async function accessToken(navigate: (to: string) => void) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) {
    navigate("/login?return=/dashboard/finance");
    return null;
  }
  return session.access_token;
}

type SettlementSummary = {
  id: string;
  courier: CourierName;
  import_status: string;
  matched_count: number;
  unmatched_count: number;
  imported_at: string;
};

type SettlementLine = {
  tracking_number: string;
  order_id: string | null;
  amount: number | null;
  discrepancy: number | null;
  status: "matched" | "unmatched" | "discrepancy" | "pending";
  orders: { friendly_id: string; amount: number } | null;
};

type SettlementReport = SettlementSummary & { lines: SettlementLine[] };

export function FinancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SettlementReport | null>(null);

  const history = useQuery({
    queryKey: ["settlements"],
    queryFn: async () => {
      const token = await accessToken(navigate);
      if (!token) throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
      return apiRequest<{ data: SettlementSummary[] }>("/v1/orders/settlements", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });

  async function handleFile(file: File) {
    setImporting(true);
    setError("");
    try {
      const token = await accessToken(navigate);
      if (!token) return;
      const text = await file.text();
      const result = await apiRequest<{ data: SettlementReport }>(
        "/v1/orders/settlements/import",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ courier: "anousith", file_content: text }),
        },
      );
      setReport(result.data);
      await queryClient.invalidateQueries({ queryKey: ["settlements"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ນຳເຂົ້າໄຟລ໌ບໍ່ສຳເລັດ");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function loadReport(id: string) {
    const token = await accessToken(navigate);
    if (!token) return;
    const result = await apiRequest<{ data: SettlementReport }>(`/v1/orders/settlements/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setReport(result.data);
  }

  return (
    <div className="page-enter dashboard-page">
      <header className="profile-identity">
        <div className="profile-name">
          <p className="eyebrow">Seller OS</p>
          <h1>COD ການຊຳລະເງິນ</h1>
        </div>
      </header>

      <section className="dashboard-section">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button disabled={importing} onClick={() => fileInput.current?.click()}>
          <FileUp size={16} /> {importing ? "ກຳລັງນຳເຂົ້າ…" : "ນຳເຂົ້າໄຟລ໌ CSV"}
        </Button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="dashboard-share__placeholder">
          <Link to="/dashboard/settings/export">ດາວໂຫລດລາຍງານລາຍໄດ້ເຕັມຮູບແບບ →</Link>
        </p>
      </section>

      {report && (
        <section className="dashboard-section settlement-report">
          <p className="eyebrow">ລາຍງານການນຳເຂົ້າ</p>
          <div className="settlement-report__totals">
            <span className="settlement-pill settlement-pill--ok">✓ ກົງ: {report.matched_count}</span>
            <span className="settlement-pill settlement-pill--bad">✗ ບໍ່ພົບ: {report.unmatched_count}</span>
            <span className="settlement-pill settlement-pill--warn">
              ⚠ ບໍ່ກົງ: {report.lines.filter((line) => line.status === "discrepancy").length}
            </span>
          </div>
          {report.lines
            .filter((line) => line.status !== "matched")
            .map((line) => (
              <div className="settlement-line" key={line.tracking_number}>
                {line.status === "unmatched" ? (
                  <span>⚠ {line.tracking_number} — ບໍ່ພົບໃນລະບົບ</span>
                ) : (
                  <span>
                    ⚠ {line.orders?.friendly_id ?? line.tracking_number} ໄດ້ຮັບ {line.amount?.toLocaleString()} ₭
                    ຄາດວ່າ {line.orders?.amount.toLocaleString()} ₭ ຕ່າງກັນ{" "}
                    {line.discrepancy && line.discrepancy > 0 ? "+" : ""}
                    {line.discrepancy?.toLocaleString()} ₭
                  </span>
                )}
              </div>
            ))}
        </section>
      )}

      <section className="dashboard-section">
        <p className="eyebrow">ປະຫວັດການນຳເຂົ້າ</p>
        {history.isLoading && <div className="profile-loading skeleton" aria-label="ກຳລັງໂຫຼດ" />}
        {history.data?.data.length === 0 && <p className="muted-copy">ຍັງບໍ່ມີການນຳເຂົ້າ</p>}
        {history.data?.data.map((settlement) => (
          <div className="settlement-history-row" key={settlement.id}>
            <span>{new Date(settlement.imported_at).toLocaleDateString("lo-LA")}</span>
            <span>{settlement.courier}</span>
            <span>ກົງ {settlement.matched_count} · ບໍ່ພົບ {settlement.unmatched_count}</span>
            <button type="button" className="text-button" onClick={() => void loadReport(settlement.id)}>
              <Download size={14} /> ເບິ່ງ
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
