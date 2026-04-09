"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create Account",
    description: "Sign up with your phone number in under 60 seconds.",
  },
  {
    number: "02",
    title: "Fund Your Wallet",
    description: "Use your dedicated bank account number to top up.",
  },
  {
    number: "03",
    title: "Buy & Enjoy",
    description: "Select a plan, enter recipient, confirm with PIN.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-20 sm:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-slate-300">
            Simple enough for everyone, powerful enough for power users.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Step indicator */}
                <div className="flex items-start gap-4 md:gap-0 md:flex-col md:items-center md:text-center">
                  <div className="relative z-10 flex-shrink-0 md:mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center border-4 border-slate-950">
                      <span className="text-2xl font-display font-bold text-white">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-2xl font-display font-bold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-400">{step.description}</p>
                  </div>
                </div>

                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="flex md:hidden justify-center my-4">
                    <ArrowRight className="rotate-90 text-teal-500 w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="text-slate-300 mb-6">
            Ready to get started? It only takes a minute.
          </p>
          <a
            href="/app"
            className="inline-block px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all duration-300 transform hover:scale-105"
          >
            Create Account Now
          </a>
        </motion.div>
      </div>
    </section>
  );
}
