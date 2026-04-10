"use client";

import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Create Account",
    description: "Sign up with your phone number in under 60 seconds.",
  },
  {
    number: "2",
    title: "Fund Your Wallet",
    description: "Use your dedicated bank account number to top up.",
  },
  {
    number: "3",
    title: "Buy & Enjoy",
    description: "Select a plan, enter recipient, confirm with PIN.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="howitworks" className="relative bg-gray-50 py-16 sm:py-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Simple and straightforward. Get data in just three steps.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step indicator */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold mb-6">
                  {step.number}
                </div>

                <h3 className="text-xl font-semibold text-black mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gray-300" style={{ width: "calc(100% + 2rem)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Get started in minutes. No complicated setup required.
          </p>
          <Link
            href="/app"
            className="inline-block px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}
