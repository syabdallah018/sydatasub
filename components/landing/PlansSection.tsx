"use client";

import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    size: "500MB",
    validity: "Weekly",
    price: 300,
    network: "MTN",
  },
  {
    size: "1GB",
    validity: "Weekly",
    price: 450,
    network: "All Networks",
    featured: true,
  },
  {
    size: "5GB",
    validity: "Monthly",
    price: 1500,
    network: "All Networks",
  },
  {
    size: "7GB",
    validity: "Monthly",
    price: 3500,
    network: "MTN",
  },
  {
    size: "20GB",
    validity: "Monthly",
    price: 7500,
    network: "All Networks",
  },
  {
    size: "75GB",
    validity: "Monthly",
    price: 18000,
    network: "All Networks",
  },
];

export function PlansSection() {
  return (
    <section id="pricing" className="relative bg-white py-16 sm:py-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Pricing That Works For You
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            No hidden fees. No surprises. Just honest pricing for every network.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-lg border transition-all ${
                plan.featured
                  ? "border-black bg-black text-white shadow-lg"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-4 px-3 py-1 bg-black text-white text-xs font-semibold rounded-full">
                  Best Value
                </div>
              )}

              <div className="p-6">
                {/* Network badge */}
                <div className="mb-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    plan.featured
                      ? "bg-white/10 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {plan.network}
                  </span>
                </div>

                {/* Plan details */}
                <h3 className="text-3xl font-bold mb-1">
                  {plan.size}
                </h3>
                <p className={`text-sm ${plan.featured ? "text-gray-300" : "text-gray-600"} mb-6`}>
                  {plan.validity}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold">
                    ₦{plan.price.toLocaleString()}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8 py-6 border-t border-b" style={{
                  borderColor: plan.featured ? "rgba(255,255,255,0.1)" : "rgb(229, 231, 235)"
                }}>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Instant delivery
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Valid for {plan.validity.toLowerCase()}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Best market rate
                  </div>
                </div>

                {/* CTA Button */}
                <Link
                  href={`/app?plan=${encodeURIComponent(plan.size)}`}
                  className={`w-full px-4 py-2 rounded-lg font-semibold text-center block transition-colors ${
                    plan.featured
                      ? "bg-white text-black hover:bg-gray-100"
                      : "bg-black text-white hover:bg-gray-900"
                  }`}
                >
                  Get {plan.size}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans available in-app with more options
          </p>
          <Link
            href="/app"
            className="inline-block px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
          >
            View All Plans
          </Link>
        </div>
      </div>
    </section>
  );
}
