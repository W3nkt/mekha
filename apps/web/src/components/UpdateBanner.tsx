import { useRegisterSW } from "virtual:pwa-register/react";
export function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return <div className="pwa-update-banner" role="status"><span>ມີການອັບເດດໃໝ່</span><button type="button" onClick={() => void updateServiceWorker(true)}>ໂຫລດໃໝ່</button></div>;
}
