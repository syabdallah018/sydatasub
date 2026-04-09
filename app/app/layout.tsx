import type { Metadata } from "next";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "SY DATA SUB - Dashboard",
  description: "Buy data, airtime, and manage your account",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen flex items-center justify-center p-0 bg-[var(--app-bg,#0A0F0E)]">
        {/* Phone mockup shadow for desktop */}
        <div className="hidden md:block fixed inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="shadow-2xl rounded-[2.5rem] w-[430px] h-[90vh] bg-black/20 blur-2xl" />
        </div>
        <div
          className="w-full max-w-[430px] min-h-screen relative overflow-hidden z-10"
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
