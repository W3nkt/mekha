import { useEffect, useState } from "react";
import { X } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@mekha/ui";
import type { LaoAddress } from "@mekha/types";

export type PrintableLabel = {
  order_id: string;
  friendly_id: string;
  tracking_number: string;
  courier: string;
  seller: { name: string | null; phone: string | null };
  customer: { name: string | null; phone: string } | null;
  address: LaoAddress | null;
  items: { product_name: string; quantity: number }[];
  amount: number;
  delivery_fee: number;
  is_cod: boolean;
};

function LabelCard({ label, qr }: { label: PrintableLabel; qr: string | null }) {
  return (
    <div className="label-card">
      <div className="label-card__brand">MEKHA / ແມ່ຄ້າ</div>
      <div className="label-card__order">{label.friendly_id}</div>
      <div className="label-card__block">
        <span className="label-card__caption">ຈາກ (From)</span>
        <strong>{label.seller.name}</strong>
        {label.seller.phone && <span>{label.seller.phone}</span>}
      </div>
      <div className="label-card__block">
        <span className="label-card__caption">ຫາ (To)</span>
        <strong>{label.customer?.name ?? "—"}</strong>
        <span>{label.customer?.phone}</span>
        {label.address && (
          <span>
            {label.address.province_name_lo} &gt; {label.address.district_name_lo}
            <br />
            {label.address.village_landmark}
          </span>
        )}
      </div>
      <div className="label-card__block">
        <span className="label-card__caption">ສິນຄ້າ</span>
        <span>
          {label.items.map((item) => `${item.product_name} ×${item.quantity}`).join(", ")}
        </span>
        <strong>
          {label.amount.toLocaleString()} ₭{label.is_cod ? " [COD]" : ""}
        </strong>
      </div>
      <div className="label-card__footer">
        {qr && <img src={qr} alt="" width={72} height={72} />}
        <div>
          <div className="label-card__tracking">{label.tracking_number}</div>
          <div>{label.courier}</div>
        </div>
      </div>
    </div>
  );
}

export function LabelPrintSheet({
  labels,
  onClose,
}: {
  labels: PrintableLabel[];
  onClose: () => void;
}) {
  const [qrByTracking, setQrByTracking] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      labels.map(async (label) => {
        const dataUrl = await QRCode.toDataURL(label.tracking_number, {
          width: 160,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        return [label.tracking_number, dataUrl] as const;
      }),
    ).then((pairs) => {
      if (!cancelled) setQrByTracking(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [labels]);

  return (
    <div className="label-print-overlay">
      <div className="label-print-toolbar">
        <span>{labels.length} ໃບຕາດ</span>
        <div>
          <Button onClick={() => window.print()}>ພິມ</Button>
          <Button variant="ghost" onClick={onClose} aria-label="ປິດ">
            <X size={18} />
          </Button>
        </div>
      </div>
      <div className="label-print-sheet">
        {labels.map((label) => (
          <LabelCard key={label.order_id} label={label} qr={qrByTracking[label.tracking_number] ?? null} />
        ))}
      </div>
    </div>
  );
}
