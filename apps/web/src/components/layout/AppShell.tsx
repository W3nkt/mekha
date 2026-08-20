import { Outlet } from "react-router-dom";

import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { UpdateBanner } from "../UpdateBanner";
import { PWAInstallPrompt } from "../PWAInstallPrompt";

export function AppShell() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
      <UpdateBanner />
      <PWAInstallPrompt />
    </div>
  );
}
