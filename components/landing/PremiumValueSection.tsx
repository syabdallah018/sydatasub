"use client";

import { motion } from "framer-motion";
import { Check, Zap, Lock, Award } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Data credits delivered in seconds, not hours. Experience the fastest service in Nigeria.",
    color: "from-blue-600 to-blue-400",
  },
  {
    icon: Award,
    title: "Best Prices Guaranteed",
    description: "Lowest rates on all networks. We match or beat any competitor — your money goes further.",
    color: "from-emerald-600 to-emerald-400",
  },
  {
    icon: Lock,
    title: "Secure & Trusted",
    description: "Bank-grade security protects every transaction. Used by over 50,000 Nigerians monthly.",
    color: "from-purple-600 to-purple-400",
  },
];

export function PremiumValueSection() {
  return (
    <section className="min-h-screen bg-white flex items-center justify-center px-4 py-20">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Why 50,000+ Nigerians trust SY DATA SUB
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We've built the fastest, most reliable data platform in Nigeria. Here's why we're different.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition h-full">
                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-4 gap-8 mt-20 pt-20 border-t border-gray-200"
        >
          {[
            { number: "50K+", label: "Active Users" },
            { number: "99.9%", label: "Uptime" },
            { number: "2sec", label: "Avg Delivery" },
            { number: "₦500M+", label: "Monthly Volume" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </p>
              <p className="text-gray-600 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
