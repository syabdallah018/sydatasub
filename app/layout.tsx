import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#198ec0",
};

export const metadata: Metadata = {
  title: "SY Data - Buy Data Instantly | Best Prices",
  description:
    "Fast, reliable data and utility payments for Nigerian users. Buy data, airtime, cable TV, and electricity instantly.",
  keywords: [
    "buy data",
    "cheap data",
    "MTN data",
    "GLO data",
    "Airtel data",
    "9mobile data",
    "Nigeria data",
    "airtime",
    "cable tv",
    "electricity",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://sydata.com"),
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SY Data",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://sydata.com",
    siteName: "SY Data",
    title: "SY Data - Buy Data Instantly",
    description:
      "Affordable, always connected. Buy data and airtime for all Nigerian networks at the best prices.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SY Data - Buy Data Instantly",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SY Data - Buy Data Instantly",
    description:
      "Affordable, always connected. Buy data and airtime for all Nigerian networks.",
    images: ["/og-image.png"],
    creator: "@sydata",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-[var(--app-bg)] text-[var(--text-primary)] font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
