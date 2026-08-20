import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { normalizeLaoPhone } from "@mekha/types";
import { supabase } from "../lib/supabase";
import { apiRequest, ApiError } from "../lib/api";

const PHONE_KEY = "mekha.registration.phone";
const laoError = (fallback: string) => fallback;

function Frame({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="registration page-enter">
      <div
        className="registration-progress"
        aria-label={`ຂັ້ນຕອນ ${step} ຈາກ 3`}
      >
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= step ? "active" : ""} />
        ))}
      </div>
      {children}
    </section>
  );
}

export function RegisterPhonePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeLaoPhone(phone);
    if (!normalized)
      return setError("ກະລຸນາໃສ່ເບີ Unitel, Lao Telecom ຫຼື ETL ທີ່ຖືກຕ້ອງ");
    if (!supabase) return setError("ລະບົບຢືນຢັນຍັງບໍ່ພ້ອມ");
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: normalized,
    });
    setBusy(false);
    if (authError) return setError(laoError("ສົ່ງລະຫັດບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່"));
    sessionStorage.setItem(PHONE_KEY, normalized);
    navigate("/register/verify");
  }
  return (
    <Frame step={1}>
      <p className="eyebrow">ເລີ່ມຕົ້ນຂາຍຢ່າງໝັ້ນໃຈ</p>
      <h1>ສ້າງຮ້ານຄ້າດ້ວຍເບີໂທ</h1>
      <p>ບໍ່ຕ້ອງໃຊ້ອີເມວ. ພວກເຮົາຈະສົ່ງລະຫັດ 6 ຕົວເລກໃຫ້ທ່ານ.</p>
      <form onSubmit={submit}>
        <label htmlFor="register-phone">ເບີໂທລະສັບ</label>
        <input
          id="register-phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="020 5555 5555"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoFocus
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy}>{busy ? "ກຳລັງສົ່ງ…" : "ຮັບລະຫັດ OTP"}</button>
      </form>
    </Frame>
  );
}

export function RegisterVerifyPage() {
  const navigate = useNavigate();
  const phone = sessionStorage.getItem(PHONE_KEY);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(60);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);
  async function verify(next = digits) {
    const token = next.join("");
    if (token.length !== 6 || !phone || !supabase) return;
    const { error: authError } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (authError) return setError("ລະຫັດບໍ່ຖືກ ຫຼື ໝົດອາຍຸແລ້ວ");
    navigate("/register/profile");
  }
  if (!phone) return <Navigate to="/register" replace />;
  return (
    <Frame step={2}>
      <p className="eyebrow">ຢືນຢັນເບີໂທ</p>
      <h1>ໃສ່ລະຫັດ 6 ຕົວ</h1>
      <p>ລະຫັດຖືກສົ່ງໄປທີ່ {phone}</p>
      <div className="otp-row">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            aria-label={`ຕົວເລກທີ ${index + 1}`}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(-1);
              const next = [...digits];
              next[index] = value;
              setDigits(next);
              if (value) refs.current[index + 1]?.focus();
              if (next.every(Boolean)) void verify(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digit)
                refs.current[index - 1]?.focus();
            }}
          />
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="text-button"
        disabled={seconds > 0}
        onClick={async () => {
          if (supabase) {
            await supabase.auth.signInWithOtp({ phone });
            setSeconds(60);
          }
        }}
      >
        {seconds > 0 ? `ສົ່ງອີກຄັ້ງໃນ ${seconds} ວິນາທີ` : "ສົ່ງລະຫັດອີກຄັ້ງ"}
      </button>
    </Frame>
  );
}

type Place = { id: string; province_id?: string; name_lo: string };
export function RegisterProfilePage() {
  const navigate = useNavigate();
  const phone = sessionStorage.getItem(PHONE_KEY);
  const [places, setPlaces] = useState<{
    provinces: Place[];
    districts: Place[];
  }>({ provinces: [], districts: [] });
  const [province, setProvince] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const [p, d] = await Promise.all([
        supabase.from("lao_provinces").select("id,name_lo").order("sort_order"),
        supabase
          .from("lao_districts")
          .select("id,province_id,name_lo")
          .order("sort_order"),
      ]);
      setPlaces({ provinces: p.data ?? [], districts: d.data ?? [] });
    })();
  }, []);
  if (!phone) return <Navigate to="/register" replace />;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return navigate("/register");
    const data = new FormData(e.currentTarget);
    try {
      await apiRequest("/v1/sellers", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          business_name_lao: data.get("business_name_lao"),
          business_name: data.get("business_name") || undefined,
          description: data.get("description") || undefined,
          province,
          district: data.get("district"),
          phone,
          facebook_url: data.get("facebook_url") || undefined,
          tiktok_url: data.get("tiktok_url") || undefined,
        }),
      });
      sessionStorage.removeItem(PHONE_KEY);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ສ້າງຮ້ານຄ້າບໍ່ສຳເລັດ");
    }
  }
  return (
    <Frame step={3}>
      <p className="eyebrow">ໂປຣໄຟລ໌ຮ້ານ</p>
      <h1>ບອກລູກຄ້າວ່າທ່ານແມ່ນໃຜ</h1>
      <form onSubmit={submit} className="profile-form">
        <label>
          ຊື່ຮ້ານພາສາລາວ *
          <input name="business_name_lao" required minLength={2} />
        </label>
        <label>
          ຊື່ຮ້ານພາສາອັງກິດ
          <input name="business_name" />
        </label>
        <label>
          ລາຍລະອຽດ
          <textarea name="description" maxLength={200} />
        </label>
        <label>
          ແຂວງ *
          <select
            required
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">ເລືອກແຂວງ</option>
            {places.provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_lo}
              </option>
            ))}
          </select>
        </label>
        <label>
          ເມືອງ *
          <select name="district" required disabled={!province}>
            <option value="">ເລືອກເມືອງ</option>
            {places.districts
              .filter((d) => d.province_id === province)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name_lo}
                </option>
              ))}
          </select>
        </label>
        <label>
          Facebook
          <input
            name="facebook_url"
            type="url"
            placeholder="https://facebook.com/..."
          />
        </label>
        <label>
          TikTok
          <input
            name="tiktok_url"
            type="url"
            placeholder="https://tiktok.com/@..."
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button>ສ້າງຮ້ານຄ້າ</button>
      </form>
    </Frame>
  );
}
