import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";

function extractSafeOrderCode(input: string): string {
  const value = input.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
  } catch {
    return value;
  }
}

export function TrackOrderPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const code = extractSafeOrderCode(input);
    if (!code) {
      setError("ກະລຸນາໃສ່ລິ້ງ ຫຼື ລະຫັດຄຳສັ່ງຊື້");
      return;
    }
    setError("");
    navigate(`/order/${code}`);
  }

  return (
    <div className="page-enter seller-search-page">
      <section className="search-hero">
        <span className="search-hero__mark" aria-hidden="true">
          <PackageSearch size={22} />
        </span>
        <p className="eyebrow">ຕິດຕາມຄຳສັ່ງຊື້</p>
        <h1>ຄົ້ນຫາຄຳສັ່ງຊື້ຂອງທ່ານ</h1>
        <p>ວາງລິ້ງ ຫຼື ພິມລະຫັດ Safe Order ທີ່ຮ້ານຄ້າສົ່ງໃຫ້ທ່ານ</p>
        <form className="track-order-form" onSubmit={submit}>
          <label className="seller-search-box">
            <span className="sr-only">ລິ້ງ ຫຼື ລະຫັດ Safe Order</span>
            <PackageSearch size={21} aria-hidden="true" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="ວາງລິ້ງ ຫຼື ລະຫັດຄຳສັ່ງຊື້"
              autoComplete="off"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="mk-button mk-button--primary">
            ຕິດຕາມຄຳສັ່ງຊື້
          </button>
        </form>
      </section>
    </div>
  );
}
