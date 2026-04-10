import type { Metadata } from "next";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "SY DATA SUB - Dashboard",
  description: "Buy data, airtime, and manage your account",
  themeColor: "#ffffff",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      {/* Android Wrapper Behavior Script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Prevent pull-to-refresh on Android
              document.addEventListener('touchmove', function(e) {
                if (e.touches.length > 1) {
                  e.preventDefault();
                }
              }, { passive: false });

              // Prevent browser context menus
              document.addEventListener('contextmenu', function(e) {
                // Allow context menu only on input fields
                if (!['input', 'textarea'].includes(e.target.tagName.toLowerCase())) {
                  e.preventDefault();
                }
              });

              // Disable pull-to-refresh
              let lastY = 0;
              document.addEventListener('touchstart', function(e) {
                lastY = e.touches[0].clientY;
              });
              
              document.addEventListener('touchmove', function(e) {
                const currentY = e.touches[0].clientY;
                if (currentY > lastY && window.scrollY === 0) {
                  e.preventDefault();
                }
              }, { passive: false });

              // Handle back button - navigate within app instead of exiting
              if (typeof window.history !== 'undefined') {
                window.addEventListener('popstate', function(e) {
                  // Let history API handle back navigation
                });
              }
            })();
          `,
        }}
      />
      
      <div className="min-h-screen flex items-center justify-center p-0 bg-white">
        {/* Phone mockup shadow for desktop */}
        <div className="hidden md:block fixed inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="shadow-2xl rounded-[2.5rem] w-[430px] h-[90vh] bg-gray-200/50 blur-2xl" />
        </div>
        <div
          className="w-full max-w-[430px] min-h-screen relative overflow-hidden z-10 bg-white"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            ::-webkit-scrollbar { display: none; }
          `}</style>
          {children}
        </div>
      </div>
    </Providers>
  );
}
