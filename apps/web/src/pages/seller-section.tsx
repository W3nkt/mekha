import { Plus, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const sections = {
  orders: { title: "ຄຳສັ່ງ", empty: "ຍັງບໍ່ມີຄຳສັ່ງ. ສ້າງຄຳສັ່ງທຳອິດ!", action: "/dashboard/orders/new" },
  products: { title: "ສິນຄ້າ", empty: "ຍັງບໍ່ມີສິນຄ້າ. ເພີ່ມສິນຄ້າທຳອິດ!", action: "/dashboard/products/new" },
  finance: { title: "ການເງິນ", empty: "ຍັງບໍ່ມີລາຍການການເງິນ.", action: "/dashboard/finance" },
  trust: { title: "ຄວາມໜ້າເຊື່ອ", empty: "ກວດເບິ່ງສະຖານະ LaoTrust ຂອງຮ້ານ.", action: "/dashboard/trust" },
  settings: { title: "ຕັ້ງຄ່າ", empty: "ຈັດການບັນຊີ ແລະ ພາສາ.", action: "/dashboard/settings" },
} as const;

export function SellerSectionPage() {
  const key = useLocation().pathname.split("/")[2] as keyof typeof sections;
  const section = sections[key] ?? sections.orders;
  const canCreate = section.action !== `/dashboard/${key}`;
  return (
    <section className="page-enter seller-section-page" aria-labelledby="seller-section-title">
      <div className="seller-section-topbar"><h1 id="seller-section-title">{section.title}</h1><button type="button" aria-label="Refresh"><RefreshCw size={19} /></button></div>
      <div className="seller-empty-state"><p>{section.empty}</p>{canCreate && <Link className="primary-link" to={section.action}><Plus size={18} /> ເພີ່ມໃໝ່</Link>}</div>
    </section>
  );
}
