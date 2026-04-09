"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function CTABanner() {
  return (
    <section className="relative py-20 sm:py-32 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-90"></div>

      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
        }}
      >
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
      </motion.div>

      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          scale: [1.1, 1, 1.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
        }}
      >
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
            Start Buying Data at the Best Prices
          </h2>

          <p className="text-xl text-white/90 mb-8">
            Join thousands of satisfied customers and experience the fastest,
            most affordable data platform in Nigeria.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/app"
              className="px-8 py-4 bg-white text-teal-600 rounded-full font-semibold hover:bg-slate-100 transition-all duration-300 text-center font-display"
            >
              Open App
            </Link>
            <button className="px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 font-display">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M17.6915026,0.972060766 C16.4744051,0.43570787 15.1302786,0.206771341 13.7711039,0.206771341 C8.16531599,0.206771341 3.50670017,4.88444281 3.50670017,10.5046365 C3.50670017,12.8603077 4.18598217,15.0554759 5.39157088,16.8899231 L4.32205982,20.9109271 C4.10919506,21.7351726 4.91938584,22.5443288 5.73356608,22.3220624 L9.68098099,21.2159624 C11.3744658,21.8663544 13.2303192,22.2389624 15.1705903,22.2389624 C20.7764769,22.2389624 25.4350927,17.5612909 25.4350927,11.9410972 C25.4350927,10.5527589 25.2068049,9.21900403 24.7787309,7.98627415 L28.4830353,6.00576096 C29.5098813,5.43821897 30.0491843,4.26849221 29.6436822,3.28268321 L27.7372293,0.172274336 C27.4205531,-0.372220911 26.8261882,-0.600758717 26.3009625,-0.388104219 L4.84652409,8.19231564 C4.32139296,8.40496901 3.94633817,8.96523265 4.10919506,9.56527761 L8.04660798,21.3351265 L4.10919506,9.56527761 Z" />
              </svg>
              Google Play
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
