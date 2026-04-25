import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PlansSection } from "@/components/landing/PlansSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PremiumValueSection } from "@/components/landing/PremiumValueSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTABanner } from "@/components/landing/CTABanner";
import { Footer } from "@/components/landing/Footer";
import { StructuredDataScripts } from "@/components/StructuredDataScripts";

export const metadata: Metadata = {
  title: "SY Data - Buy Data & Airtime Online in Nigeria",
  description:
    "Fast, affordable data plans for MTN, Glo, Airtel and 9mobile with instant delivery. SY Data keeps purchases simple, fast and reliable.",
  keywords:
    "buy data Nigeria, airtime, data plans, MTN, Airtel, Glo, 9mobile, instant delivery, bill payment",
  authors: [{ name: "SY Data" }],
  creator: "SY Data",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://sydata.com",
    title: "SY Data - Buy Data & Airtime Online in Nigeria",
    description:
      "Fast, affordable data plans for all networks with instant delivery and a cleaner checkout experience.",
    images: "/og-image.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "SY Data - Buy Data & Airtime Online in Nigeria",
    description:
      "Fast, affordable data plans for all networks with instant delivery and simple wallet funding.",
    images: "/og-image.png",
    creator: "@sydata",
  },
};

export default function LandingPage() {
  return (
    <>
      <StructuredDataScripts />
      <main className="min-h-screen overflow-hidden bg-white text-slate-950">
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <PlansSection />
        <HowItWorksSection />
        <PremiumValueSection />
        <FAQSection />
        <CTABanner />
        <Footer />
      </main>
    </>
  );
}
