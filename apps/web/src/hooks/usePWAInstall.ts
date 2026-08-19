import { useEffect, useState } from "react";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferredPrompt: InstallEvent | null = null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredPrompt = event as InstallEvent; });
export function usePWAInstall() { const [canInstall, setCanInstall] = useState(false); useEffect(() => { setCanInstall(Boolean(deferredPrompt)); }, []); const install = async () => { if (!deferredPrompt) return; await deferredPrompt.prompt(); if ((await deferredPrompt.userChoice).outcome === "accepted") { deferredPrompt = null; setCanInstall(false); } }; return { canInstall, install }; }
