"use client";

import { useEffect } from "react";

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
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
    <div className="min-h-screen flex items-center justify-center p-0 bg-white">
      {/* Phone mockup shadow for desktop */}
      <div className="hidden md:block fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="shadow-2xl rounded-[2.5rem] w-[430px] h-[90vh] bg-gray-200/50 blur-2xl" />
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
