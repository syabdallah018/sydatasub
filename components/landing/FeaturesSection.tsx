"use client";

import { motion } from "framer-motion";
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
    description:
      "Data delivered to your line in seconds, guaranteed.",
    color: "from-yellow-500/20 to-orange-500/20",
    iconColor: "text-yellow-400",
  },
  {
    icon: CreditCard,
    title: "Smart Wallet",
    description:
      "Fund your wallet once, buy data anytime with your 6-digit PIN.",
    color: "from-teal-500/20 to-emerald-500/20",
    iconColor: "text-teal-400",
  },
  {
    icon: Building2,
    title: "Dedicated Account",
    description:
      "Get your personal bank account number for seamless funding.",
    color: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Gift,
    title: "Earn Rewards",
    description:
      "Get credited just for using SY DATA SUB. Loyalty has its perks.",
    color: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-400",
  },
  {
    icon: Smartphone,
    title: "Native App Experience",
    description:
      "Our web app is built like a native iOS app. Smooth, fast, beautiful.",
    color: "from-purple-500/20 to-indigo-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description:
      "All payments secured by Flutterwave. No failed transactions.",
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-400",
  },
];

export function FeaturesSection() {
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
    <section id="features" className="relative py-20 sm:py-32 px-4">
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
            Why Choose{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              SY DATA SUB
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Everything you need for the best data buying experience in Nigeria.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group"
              >
                <div className={`relative h-full p-8 rounded-2xl bg-gradient-to-br ${feature.color} border border-slate-700/50 hover:border-slate-600 transition-all duration-300 backdrop-blur-sm`}>
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 to-transparent"></div>

                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                    </div>

                    <h3 className="text-xl font-display font-bold text-white mb-2">
                      {feature.title}
                    </h3>

                    <p className="text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
