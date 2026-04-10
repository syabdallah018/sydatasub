import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SY DATA SUB — Buy Data Instantly",
  description:
    "Affordable, always connected. Buy data and airtime for all Nigerian networks at the best prices. Fast delivery, zero hassle.",
  keywords: ["buy data", "cheap data", "MTN data", "GLO data", "Airtel data", "9mobile data", "Nigeria data", "airtime"],
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SY DATA SUB",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "SY DATA SUB",
    title: "SY DATA SUB — Buy Data Instantly",
    description: "Affordable, always connected. Buy data and airtime for all Nigerian networks at the best prices.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SY DATA SUB - Buy Data Instantly",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SY DATA SUB — Buy Data Instantly",
    description: "Affordable, always connected. Buy data and airtime for all Nigerian networks.",
    images: ["/og-image.png"],
    creator: "@sydatasub",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
