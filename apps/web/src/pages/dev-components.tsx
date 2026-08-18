import { useState } from "react";
import {
  AddressDisplay,
  BottomNav,
  Button,
  Input,
  OrderStatusBadge,
  TrustBadge,
} from "@mekha/ui";
import { OrderStatus } from "@mekha/types";

const navItems = [
  { id: "orders", label: "ອໍເດີ", icon: "▤" },
  { id: "products", label: "ສິນຄ້າ", icon: "□" },
  { id: "finance", label: "ການເງິນ", icon: "₭" },
  { id: "trust", label: "ຄວາມໄວ້ໃຈ", icon: "◇" },
  { id: "settings", label: "ຕັ້ງຄ່າ", icon: "○" },
] as const;

export function ComponentsPage() {
  const [active, setActive] = useState("orders");
  return (
    <div className="component-lab page-enter">
      <header className="component-lab__intro">
        <p className="eyebrow">Mekha interface system / 01</p>
        <h1>
          ເຄື່ອງມືທີ່ອ່ານງ່າຍ
          <br />
          ແລະ ໃຊ້ໄດ້ໄວ
        </h1>
        <p>
          High-contrast controls for Lao sellers, tuned for outdoor use and
          one-handed operation.
        </p>
      </header>
      <section className="component-lab__section">
        <div>
          <span className="component-lab__index">01</span>
          <h2>Actions</h2>
          <p>Every action is at least 44 pixels tall.</p>
        </div>
        <div className="component-lab__samples">
          <Button>ສ້າງອໍເດີໃໝ່</Button>
          <Button variant="secondary">ບັນທຶກຮ່າງ</Button>
          <Button variant="danger">ຍົກເລີກ</Button>
          <Button variant="ghost">ກັບຄືນ</Button>
        </div>
      </section>
      <section className="component-lab__section">
        <div>
          <span className="component-lab__index">02</span>
          <h2>Fields</h2>
          <p>Generous line height keeps Lao tone marks clear.</p>
        </div>
        <div className="component-lab__samples component-lab__fields">
          <Input
            label="ຊື່ລູກຄ້າ"
            placeholder="ປ້ອນຊື່"
            helperText="ຊື່ທີ່ໃຊ້ຮັບສິນຄ້າ"
          />
          <Input
            label="ເບີໂທ"
            defaultValue="020"
            error="ກະລຸນາກວດເບີໂທອີກຄັ້ງ"
          />
        </div>
      </section>
      <section className="component-lab__section">
        <div>
          <span className="component-lab__index">03</span>
          <h2>Trust and status</h2>
          <p>Labels and symbols carry meaning; colour never works alone.</p>
        </div>
        <div className="component-lab__samples">
          <TrustBadge status="verified" caution="low" label="ຢືນຢັນແລ້ວ" />
          <TrustBadge
            status="partially_verified"
            caution="medium"
            label="ກວດສອບບາງສ່ວນ"
          />
          <TrustBadge
            status="unverified"
            caution="insufficient_information"
            label="ຂໍ້ມູນບໍ່ພຽງພໍ"
          />
          <div className="component-lab__statuses">
            {OrderStatus.map((status) => (
              <OrderStatusBadge key={status} status={status} />
            ))}
          </div>
        </div>
      </section>
      <section className="component-lab__section">
        <div>
          <span className="component-lab__index">04</span>
          <h2>Place and navigation</h2>
          <p>Reference data stays structured; village detail stays human.</p>
        </div>
        <div className="component-lab__samples component-lab__nav-sample">
          <AddressDisplay
            address={{
              province_id: "VTE",
              province_name_lo: "ນະຄອນຫຼວງວຽງຈັນ",
              province_name_en: "Vientiane Capital",
              district_id: "VTE-0101",
              district_name_lo: "ຈັນທະບູລີ",
              district_name_en: "Chanthabuly",
              village_landmark: "ບ້ານ ສີຫອມ, ໃກ້ຕະຫຼາດ",
              gps_lat: 17.9757,
              gps_lng: 102.6331,
            }}
          />
          <BottomNav items={navItems} activeId={active} onSelect={setActive} />
        </div>
      </section>
    </div>
  );
}
