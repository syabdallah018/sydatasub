import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import AppLayoutClient from "./layout-client";

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
      <AppLayoutClient>{children}</AppLayoutClient>
    </Providers>
  );
}
