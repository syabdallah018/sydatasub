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
    icon: "/favicon.svg",
    apple: "/logo.jpeg",
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
        url: "/logo.jpeg",
        width: 500,
        height: 500,
        alt: "SY DATA SUB Logo",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SY DATA SUB — Buy Data Instantly",
    description: "Affordable, always connected. Buy data and airtime for all Nigerian networks.",
    images: ["/logo.jpeg"],
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
