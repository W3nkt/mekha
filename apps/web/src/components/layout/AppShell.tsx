import { Outlet } from "react-router-dom";

import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { UpdateBanner } from "../UpdateBanner";

export function AppShell() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
      <UpdateBanner />
    </div>
  );
}
