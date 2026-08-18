import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "../lib/api";
import { supabase } from "../lib/supabase";

type QueueItem = {
  id: string;
  seller_id: string;
  verification_type: string;
  status: string;
  created_at: string;
  seller_profiles: {
    business_name: string;
    business_name_lao: string | null;
    phone: string | null;
  } | null;
};
type Detail = QueueItem & {
  document_url: string | null;
  reviewer_notes: string | null;
  submitted_data: unknown;
  seller_profiles: {
    id: string;
    business_name: string;
    business_name_lao: string | null;
    phone: string | null;
    created_at: string;
    verification_status: string;
  } | null;
  previous: Array<{
    id: string;
    verification_type: string;
    status: string;
    reviewer_notes: string | null;
    created_at: string;
  }>;
};
type Audit = {
  id: string;
  event: string;
  entity_type: string | null;
  created_at: string;
  metadata: unknown;
  users: { phone: string | null } | null;
};

export function AdminVerificationsPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [audits, setAudits] = useState<Audit[]>([]);
  async function loadQueue(accessToken = token) {
    const response = await apiRequest<{ data: QueueItem[]; total: number }>(
      `/v1/admin/verifications?status=${status}&page=${page}${type ? `&type=${encodeURIComponent(type)}` : ""}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    setItems(response.data);
    setTotal(response.total);
  }
  async function open(id: string) {
    const response = await apiRequest<{ data: Detail }>(
      `/v1/admin/verifications/${id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setSelected(response.data);
    setNote(response.data.reviewer_notes ?? "");
  }
  useEffect(() => {
    void (async () => {
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      if (!session) return setError("ກະລຸນາເຂົ້າລະບົບດ້ວຍບັນຊີຜູ້ຄຸ້ມຄອງ");
      setToken(session.access_token);
      try {
        await loadQueue(session.access_token);
        const audit = await apiRequest<{ data: Audit[] }>(
          "/v1/admin/audit-logs",
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        setAudits(audit.data);
      } catch (e) {
        setError(
          e instanceof ApiError && e.status === 403
            ? "ບັນຊີນີ້ບໍ່ມີສິດຜູ້ຄຸ້ມຄອງ"
            : "ໂຫລດຄິວບໍ່ສຳເລັດ",
        );
      }
    })();
  }, [status, page, type]);
  async function decide(action: "approve" | "reject" | "request-info") {
    if (action !== "approve" && !note.trim())
      return setError("ກະລຸນາໃສ່ເຫດຜົນ");
    if (!selected) return;
    await apiRequest(`/v1/admin/verifications/${selected.id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reviewer_notes: note || undefined }),
    });
    setSelected(null);
    setNote("");
    await loadQueue();
  }
  async function suspend() {
    if (!selected || !note.trim()) return setError("ກະລຸນາໃສ່ເຫດຜົນ");
    await apiRequest(`/v1/admin/sellers/${selected.seller_id}/suspend`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reviewer_notes: note }),
    });
    setSelected(null);
    await loadQueue();
  }
  return (
    <section className="admin-review page-enter">
      <header>
        <div>
          <p className="eyebrow">LAOTRUST OPERATIONS</p>
          <h1>Verification queue</h1>
        </div>
        <strong>{total} pending reviews</strong>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-filters">
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="additional_info_required">More info</option>
          </select>
        </label>
        <label>
          Type
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="identity">Identity</option>
            <option value="business_registration">Business</option>
            <option value="e_trust">E-Trust</option>
            <option value="social_account">Social</option>
            <option value="payment_identity">Payment</option>
          </select>
        </label>
      </div>
      <div className="admin-review-grid">
        <div className="admin-queue">
          <div className="queue-head">
            <span>Seller</span>
            <span>Type</span>
            <span>Submitted</span>
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              className={selected?.id === item.id ? "selected" : ""}
              onClick={() => void open(item.id)}
            >
              <span>
                <strong>
                  {item.seller_profiles?.business_name_lao ||
                    item.seller_profiles?.business_name ||
                    "—"}
                </strong>
                <small>{item.seller_profiles?.phone}</small>
              </span>
              <span>{item.verification_type.replaceAll("_", " ")}</span>
              <time>{new Date(item.created_at).toLocaleDateString()}</time>
            </button>
          ))}
          <nav>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>Page {page}</span>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        </div>
        <aside className="review-pane">
          {selected ? (
            <>
              <div>
                <small>{selected.verification_type.replaceAll("_", " ")}</small>
                <h2>
                  {selected.seller_profiles?.business_name_lao ||
                    selected.seller_profiles?.business_name}
                </h2>
                <p>
                  {selected.seller_profiles?.phone} · joined{" "}
                  {selected.seller_profiles &&
                    new Date(
                      selected.seller_profiles.created_at,
                    ).toLocaleDateString()}
                </p>
              </div>
              {selected.document_url ? (
                <iframe
                  title="Verification document"
                  src={selected.document_url}
                  sandbox="allow-downloads"
                />
              ) : (
                <div className="document-empty">No document</div>
              )}
              <label>
                Moderator note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                />
              </label>
              <div className="decision-actions">
                <button
                  className="approve"
                  onClick={() => void decide("approve")}
                >
                  Approve
                </button>
                <button onClick={() => void decide("request-info")}>
                  Request info
                </button>
                <button
                  className="reject"
                  onClick={() => void decide("reject")}
                >
                  Reject
                </button>
              </div>
              <button className="suspend-action" onClick={() => void suspend()}>
                Suspend seller
              </button>
              <details>
                <summary>
                  Previous decisions ({selected.previous.length})
                </summary>
                {selected.previous.map((row) => (
                  <p key={row.id}>
                    {row.verification_type} · {row.status}
                  </p>
                ))}
              </details>
            </>
          ) : (
            <div className="review-empty">Select a verification to review</div>
          )}
        </aside>
      </div>
      <section className="admin-audit">
        <h2>Recent admin actions</h2>
        {audits.slice(0, 20).map((row) => (
          <div key={row.id}>
            <strong>{row.event.replaceAll("_", " ")}</strong>
            <span>{row.users?.phone ?? row.entity_type ?? "system"}</span>
            <time>{new Date(row.created_at).toLocaleString()}</time>
          </div>
        ))}
      </section>
    </section>
  );
}
