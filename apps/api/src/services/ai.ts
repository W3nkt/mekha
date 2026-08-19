import type { ApiBindings } from "../types";

type Classification = { classification: "genuine" | "possible_abuse" | "duplicate"; confidence: number; note: string };
const requestQwen = async (env: ApiBindings, model: string, prompt: string): Promise<string | null> => {
  const key = env.DASHSCOPE_API_KEY ?? env.QWEN_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"}/chat/completions`, { method: "POST", signal: controller.signal, headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, temperature: 0, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }) });
    if (!response.ok) return null;
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return body.choices?.[0]?.message?.content ?? null;
  } catch { return null; } finally { clearTimeout(timeout); }
};
export const classifyReport = async (env: ApiBindings, report: unknown): Promise<Classification | null> => {
  const text = await requestQwen(env, "qwen-flash", `Classify this LaoTrust report: ${JSON.stringify(report)}. Return JSON {"classification":"genuine|possible_abuse|duplicate","confidence":0.0,"note":"..."}.`);
  if (!text) return null;
  try { const result = JSON.parse(text) as Partial<Classification>; if (!["genuine", "possible_abuse", "duplicate"].includes(result.classification ?? "")) return null; return { classification: result.classification as Classification["classification"], confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0)), note: String(result.note ?? "") }; } catch { return null; }
};
export const summarizeEvidence = async (env: ApiBindings, evidence: unknown) => {
  const text = await requestQwen(env, "qwen3.7-plus", `Write a neutral 2-3 sentence evidence summary for a moderator. Never claim verification. Return JSON {"summary":"..."}. Evidence: ${JSON.stringify(evidence)}`);
  if (!text) return null;
  try { const result = JSON.parse(text) as { summary?: string }; return result.summary ? `🤖 AI: ${result.summary}` : null; } catch { return null; }
};
