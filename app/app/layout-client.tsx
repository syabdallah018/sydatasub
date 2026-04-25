"use client";

import { useEffect } from "react";

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Detect if running in webview and add class for styling
    const isWebView = /Android|iPhone|iPad|Mac/i.test(navigator.userAgent) && 
                     getComputedStyle(document.documentElement).getPropertyValue('--is-webview') !== '';
    if (isWebView || (window as any).cordova || (window as any).Capacitor) {
      document.documentElement.classList.add("is-webview");
    }

    // Disable elastic scroll for webview (iOS)
    if (navigator.userAgent.includes('WebKit')) {
      document.body.style.overscrollBehavior = 'none';
    }

    // Prevent pull-to-refresh on Android
    const preventPullRefresh = (e: TouchEvent) => {
      if ((e.touches as any).length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener("touchmove", preventPullRefresh, { passive: false });

    // Prevent browser context menus (allow on input fields)
    const preventContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!["INPUT", "TEXTAREA"].includes(target.tagName)) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", preventContextMenu);

    // Disable pull-to-refresh
    let lastY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0].clientY;
    };
    document.addEventListener("touchstart", handleTouchStart);

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      if (currentY > lastY && window.scrollY === 0) {
        e.preventDefault();
      }
    };
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    // Cleanup
    return () => {
      document.removeEventListener("touchmove", preventPullRefresh);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-0 bg-[radial-gradient(circle_at_top,rgba(25,142,192,0.08),transparent_35%),linear-gradient(180deg,#f4fbff_0%,#ffffff_55%,#eef8ff_100%)]">
      {/* Phone mockup shadow for desktop */}
      <div className="hidden md:block fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="shadow-2xl rounded-[2.5rem] w-[430px] h-[90vh] bg-[rgba(25,142,192,0.18)] blur-2xl" />
      </div>
      <div
        className="w-full max-w-[430px] min-h-screen relative overflow-hidden z-10 bg-white"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
          ::-webkit-scrollbar { display: none; }
        `}</style>
        {children}
      </div>
    </div>
  );
}
