import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PlansSection } from "@/components/landing/PlansSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTABanner } from "@/components/landing/CTABanner";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "SY DATA SUB - Buy Data & Airtime Online in Nigeria",
  description:
    "Fast, affordable data plans for MTN, Glo, Airtel & 9Mobile. Get instant delivery with SY DATA SUB. Best prices. Zero stress. Trusted by 10,000+ Nigerians.",
  keywords:
    "buy data Nigeria, airtime, data plans, MTN, Airtel, Glo, 9Mobile, fast data delivery",
  authors: [{ name: "SY DATA SUB" }],
  creator: "SY DATA SUB",
  formatDetection: {
    email: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://sydatasub.com",
    images: "https://sydatasub.com/og-image.png",
    title: "SY DATA SUB - Buy Data & Airtime Online in Nigeria",
    description:
      "Fast, affordable data plans for all networks with instant delivery",
  },
  twitter: {
    card: "summary_large_image",
    title: "SY DATA SUB - Buy Data & Airtime Online in Nigeria",
    description:
      "Fast, affordable data plans for all networks with instant delivery",
    images: "https://sydatasub.com/og-image.png",
    creator: "@sydatasub",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Plans Section */}
      <PlansSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* FAQ */}
      <FAQSection />

      {/* CTA Banner */}
      <CTABanner />

      {/* Footer */}
      <Footer />
    </main>
  );
}
