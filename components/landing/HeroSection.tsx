"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export function HeroSection() {
  const headline = [
    "Nigeria's",
    "Fastest",
    "Data,",
    "Delivered",
    "Instantly.",
  ];

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

  const wordVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
      },
    },
  };

  const networkLogos = [
    { name: "MTN", color: "from-yellow-500 to-yellow-600", x: "10%", delay: 0 },
    { name: "Glo", color: "from-green-500 to-green-600", x: "80%", delay: 0.2 },
    {
      name: "Airtel",
      color: "from-red-500 to-red-600",
      x: "20%",
      delay: 0.4,
    },
    {
      name: "9Mobile",
      color: "from-cyan-500 to-cyan-600",
      x: "75%",
      delay: 0.6,
    },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-teal-950/30 to-slate-950">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: "2s"}}></div>
        </div>
      </div>

      {/* Floating network logos */}
      {networkLogos.map((logo) => (
        <motion.div
          key={logo.name}
          className="absolute opacity-20 blur-sm"
          style={{ left: logo.x, top: "30%" }}
          animate={{
            y: [0, -30, 0],
          }}
          transition={{
            duration: 6,
            delay: logo.delay,
            repeat: Infinity,
          }}
        >
          <div className={`w-24 h-24 bg-gradient-to-br ${logo.color} rounded-lg opacity-60`}></div>
        </motion.div>
      ))}

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main headline */}
        <motion.div
          className="mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight tracking-tight">
            {headline.map((word, index) => (
              <motion.span
                key={index}
                variants={wordVariants}
                className={`${
                  word === "Fastest" || word === "Delivered"
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400"
                    : "text-white"
                } inline-block mr-2 sm:mr-3`}
              >
                {word}
              </motion.span>
            ))}
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Buy data for all networks — MTN, Glo, Airtel & 9Mobile — at the best
          prices, with zero stress.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Link
            href="/app"
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-full font-semibold hover:shadow-2xl hover:shadow-teal-500/50 transition-all duration-300 transform hover:scale-105 text-center"
          >
            Buy Data Now
          </Link>
          <button className="px-8 py-4 border-2 border-slate-600 text-white rounded-full font-semibold hover:bg-slate-800/50 transition-all duration-300 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
              <path d="M3 3c0-1.1.9-2 2-2h2.6l1.5 3H5V3zm18 0v2h3l-1.5 3h2.6L21 1h2V3zm0 18v-2h3l1.5-3h2.6l-3 3v2zm-18 0V5h-3l-1.5 3h2.6L3 21h2v2zm11 0c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z" />
            </svg>
            Google Play
          </button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className="mt-12 flex justify-center gap-6 text-sm text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <div>✓ Instant Delivery</div>
          <div>✓ No Hidden Fees</div>
          <div>✓ Secure Payments</div>
        </motion.div>
      </div>
    </section>
  );
}
