import { FormEvent, useState } from "react";
import { apiRequest } from "../lib/api";

const categories = ["product_not_received", "wrong_product", "misleading_description", "suspected_fake_seller", "payment_issue", "seller_impersonation", "suspicious_advertisement", "other"];
export function ReportProblemPage() {
  const [sellerId, setSellerId] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setResult("");
    try {
      const response = await apiRequest<{ data: { reference: string } }>("/v1/reports", { method: "POST", body: JSON.stringify({ seller_id: sellerId, report_type: category, description, evidence_paths: evidence.split("\n").map((item) => item.trim()).filter(Boolean) }) });
      setResult(`Report received: ${response.data.reference}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to submit report"); }
  }
  return <main className="page-enter"><h1>Report a problem</h1><p>Reports are reviewed by LaoTrust. They do not affect a seller’s public status until reviewed.</p><form onSubmit={submit}><label>Seller ID<input required value={sellerId} onChange={(event) => setSellerId(event.target.value)} /></label><label>Problem type<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Description (minimum 50 characters)<textarea required minLength={50} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Evidence file paths (one per line)<textarea required value={evidence} onChange={(event) => setEvidence(event.target.value)} /></label><button type="submit">Submit report</button></form>{result && <p role="status">{result}</p>}{error && <p role="alert">{error}</p>}</main>;
}
