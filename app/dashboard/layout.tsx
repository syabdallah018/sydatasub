import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SY DATA SUB - Desktop Portal",
  description: "Buy data, airtime, and configure developer APIs on SY DATA SUB",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fbfbfd] text-slate-900">
      {children}
    </div>
  );
}
