import { Suspense } from "react";
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
        <Suspense
          fallback={
            <div className="route-loading" role="status" aria-live="polite">
              <span className="route-loading__mark" aria-hidden="true" />
              <span>ກຳລັງເປີດໜ້າ…</span>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
      <UpdateBanner />
      <PWAInstallPrompt />
    </div>
  );
}
