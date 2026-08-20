import { useRef, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeLaoPhone } from "@mekha/types";
import { supabase } from "../lib/supabase";

const LOGIN_PHONE_KEY = "mekha.login.phone";
export function LoginPage() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const normalized = normalizeLaoPhone(phone);
    if (!normalized) return setError("Enter a valid Lao mobile number (020 XX XXX XXX)");
    if (!supabase) return setError("Phone authentication is not configured");
    setBusy(true);
    const result = await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: true } });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    sessionStorage.setItem(LOGIN_PHONE_KEY, normalized);
    setPhone(normalized);
    setStep("otp");
  }
  async function verifyOtp(event?: React.FormEvent) {
    event?.preventDefault();
    setError("");
    const normalized = sessionStorage.getItem(LOGIN_PHONE_KEY) ?? normalizeLaoPhone(phone);
    if (!normalized || !/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code");
    if (!supabase) return setError("Phone authentication is not configured");
    setBusy(true);
    const result = await supabase.auth.verifyOtp({ phone: normalized, token: otp, type: "sms" });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    sessionStorage.removeItem(LOGIN_PHONE_KEY);
    window.location.assign("/dashboard");
  }

  return (
    <section className="page-enter login-page">
      <div className="login-symbol">
        <LockKeyhole size={26} />
      </div>
      <h1>{t("auth.title")}</h1>
      <p>{t("auth.description")}</p>
      {step === "phone" ? <form className="phone-form" onSubmit={requestOtp}>
        <label htmlFor="phone">{t("auth.country")}</label>
        <div className="phone-control"><span>+856</span><input id="phone" data-testid="phone-input" inputMode="tel" autoComplete="tel-national" placeholder={t("auth.phonePlaceholder")} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy} data-testid="send-otp">{busy ? "Sending…" : t("auth.continue")} <ArrowRight size={18} /></button>
      </form> : <form className="phone-form" onSubmit={verifyOtp}>
        <p>Code sent to {phone}</p>
        <div className="otp-row">{Array.from({ length: 6 }, (_, index) => <input key={index} ref={(element) => { refs.current[index] = element; }} data-testid="otp-input" aria-label={`OTP digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} value={otp[index] ?? ""} onChange={(event) => { const value = event.target.value.replace(/\D/g, "").slice(-1); const next = otp.split(""); next[index] = value; setOtp(next.join("")); if (value) refs.current[index + 1]?.focus(); }} onKeyDown={(event) => { if (event.key === "Backspace" && !otp[index]) refs.current[index - 1]?.focus(); }} />)}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy} data-testid="verify-otp">{busy ? "Verifying…" : "Verify code"}</button>
        <button type="button" className="text-button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}>Change phone number</button>
      </form>}
    </section>
  );
}
