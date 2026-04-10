"use client";

import { Zap, Lock, Award } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Data credits delivered in seconds. Most users receive data within 2-5 seconds.",
  },
  {
    icon: Award,
    title: "Best Prices Guaranteed",
    description: "We match or beat any competitor on all networks. Your money goes further with us.",
  },
  {
    icon: Lock,
    title: "Secure & Trusted",
    description: "Bank-grade security protects every transaction. Trusted by 50,000+ Nigerians.",
  },
];

export function PremiumValueSection() {
  return (
    <section className="bg-gray-50 py-16 sm:py-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4 leading-tight">
            Why customers choose us
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We've built the fastest and most reliable data platform in Nigeria.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-lg font-semibold text-black mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="border-t border-gray-200 pt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "50K+", label: "Users" },
              { number: "99.9%", label: "Uptime" },
              { number: "2sec", label: "Delivery" },
              { number: "₦500M+", label: "Volume" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-black mb-2">
                  {stat.number}
                </p>
                <p className="text-gray-600 font-medium text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
