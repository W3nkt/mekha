import { CloudOff, Cloud } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <CloudOff size={16} aria-hidden="true" />
      <span>ບໍ່ມີການເຊື່ອມຕໍ່ອິນເຕີເນັດ — ຂໍ້ມູນຈະຖືກບັນທຶກໄວ້ກ່ອນ</span>
    </div>
  );
}
