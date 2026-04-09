"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  };

  return (
    <section id="plans" className="relative py-20 sm:py-32 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            Prices That Actually Make Sense
          </h2>
          <p className="text-xl text-slate-300">
            We don't inflate. We deliver value.
          </p>
        </motion.div>

        {/* Plans grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group"
            >
              <div className="relative h-full p-8 rounded-2xl border border-slate-700/50 hover:border-teal-500/50 transition-all duration-300 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:shadow-lg hover:shadow-teal-500/10">
                {/* Network badge */}
                <div className="absolute top-4 right-4">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-500/20 text-teal-300">
                    {plan.network}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <div className="text-4xl sm:text-5xl font-display font-bold text-white mb-2">
                    {plan.size}
                  </div>
                  <p className="text-slate-400 text-sm">{plan.validity}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-display font-bold text-white">
                    ₦{plan.price.toLocaleString()}
                  </span>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400" />
                    Instant delivery
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400" />
                    No expiration rush
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400" />
                    Best price guarantee
                  </div>
                </div>

                {/* CTA Button */}
                <Link
                  href="/app"
                  className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all duration-300 text-center block group-hover:translate-y-[-2px]"
                >
                  Buy Now
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* All plans link */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors font-semibold"
          >
            View all available plans →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
