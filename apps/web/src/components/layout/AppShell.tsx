import { Outlet } from "react-router-dom";

import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { UpdateBanner } from "../UpdateBanner";
import { PWAInstallPrompt } from "../PWAInstallPrompt";
import { OfflineBanner } from "./OfflineBanner";

export function AppShell() {
  return (
    <div className="app-shell">
      <TopBar />
      <OfflineBanner />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
      <UpdateBanner />
      <PWAInstallPrompt />
    </div>
  );
}
