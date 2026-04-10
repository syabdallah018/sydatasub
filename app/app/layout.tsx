import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import AppLayoutClient from "./layout-client";
import { SplashScreenWrapper } from "@/components/app/splash";

export const metadata: Metadata = {
  title: "SY DATA SUB - Dashboard",
  description: "Buy data, airtime, and manage your account",
  themeColor: "#ffffff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <SplashScreenWrapper>
        <AppLayoutClient>{children}</AppLayoutClient>
      </SplashScreenWrapper>
    </Providers>
  );
}
