import { useEffect, useState } from "react";
import { Bell, Download, X } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { usePushNotifications } from "../hooks/usePushNotifications";

export function PWAInstallPrompt() {
  const { canInstall, install } = usePWAInstall();
  const { status, enable } = usePushNotifications();
  const [visits, setVisits] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const next = Number(sessionStorage.getItem("mekha-visits") ?? "0") + 1;
    sessionStorage.setItem("mekha-visits", String(next));
    setVisits(next);
  }, []);

  const canEnableNotifications = status === "default";
  if (dismissed || (!canInstall && !canEnableNotifications) || visits < 3) {
    return null;
  }

  const notificationOnly = !canInstall && canEnableNotifications;

  return (
    <aside className="pwa-install-prompt" aria-labelledby="pwa-prompt-title">
      <button
        className="pwa-install-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="ປິດ"
        type="button"
      >
        <X size={20} aria-hidden="true" />
      </button>
      <span className="pwa-install-prompt__icon" aria-hidden="true">
        {notificationOnly ? <Bell size={20} /> : <Download size={20} />}
      </span>
      <div className="pwa-install-prompt__content">
        <strong id="pwa-prompt-title">
          {notificationOnly
            ? "ຮັບແຈ້ງເຕືອນຄຳສັ່ງຊື້"
            : "ຕິດຕັ້ງ Mekha ໃສ່ໜ້າຈໍ"}
        </strong>
        <p>
          {notificationOnly
            ? "ຮູ້ສະຖານະຄຳສັ່ງຊື້ໄດ້ທັນທີ."
            : "ເຂົ້າໃຊ້ງ່າຍຂຶ້ນຈາກໜ້າຈໍຂອງທ່ານ."}
        </p>
        <div className="pwa-install-prompt__actions">
          {canInstall && (
            <button type="button" onClick={() => void install()}>
              ຕິດຕັ້ງ
            </button>
          )}
          {canEnableNotifications && (
            <button
              type="button"
              className={canInstall ? "pwa-install-secondary" : undefined}
              onClick={() => void enable()}
            >
              ຮັບແຈ້ງເຕືອນ
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
