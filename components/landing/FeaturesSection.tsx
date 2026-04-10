"use client";

import {
  Zap,
  CreditCard,
  Building2,
  Gift,
  Smartphone,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Data arrives instantly. No waiting, no delays.",
  },
  {
    icon: CreditCard,
    title: "Smart Wallet",
    description: "Fund once, buy anytime with your secure PIN.",
  },
  {
    icon: Building2,
    title: "Dedicated Account",
    description: "Personal bank account for seamless funding.",
  },
  {
    icon: Gift,
    title: "Earn Rewards",
    description: "Get rewarded just for using SY DATA SUB.",
  },
  {
    icon: Smartphone,
    title: "App Experience",
    description: "Smooth, fast, beautiful app-like interface.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Secured by Flutterwave, 99.9% uptime.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative bg-white py-16 sm:py-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Why SY DATA SUB?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We've built everything you need for the best data experience in Nigeria.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Icon className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-black mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
