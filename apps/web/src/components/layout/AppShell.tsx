import { Outlet } from "react-router-dom";

import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
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
    </div>
  );
}
