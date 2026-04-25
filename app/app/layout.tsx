import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import AppLayoutClient from "./layout-client";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#198ec0",
};

export const metadata: Metadata = {
  title: "SY Data - Buy Data, Airtime & Pay Bills",
  description:
    "Fast, reliable data, airtime, cable TV, and electricity payments. Best prices on MTN, Glo, Airtel, and 9Mobile.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "SY Data",
    description: "Your one-stop platform for mobile recharges and utility bills",
    images: ["/og-image.png"],
  },
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
