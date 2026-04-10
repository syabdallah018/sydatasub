"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative bg-white pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden">
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-black leading-tight mb-8">
          Get data instantly.
          <br />
          <span className="text-gray-600">No waiting. No delays.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          Buy mobile data for MTN, Glo, Airtel & 9Mobile at the best prices. 
          Delivered in seconds with zero hassle.
        </p>

        {/* Trust indicators - stats row */}
        <div className="flex flex-col sm:flex-row justify-center gap-8 mb-12 py-8 border-y border-gray-200/50">
          <div className="flex flex-col items-center">
            <div className="text-2xl sm:text-3xl font-bold text-black">50K+</div>
            <div className="text-sm text-gray-600">Happy Customers</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl sm:text-3xl font-bold text-black">1M+</div>
            <div className="text-sm text-gray-600">Transactions</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl sm:text-3xl font-bold text-black">4.9★</div>
            <div className="text-sm text-gray-600">Rated on Stores</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/app"
            className="px-8 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors duration-200 text-center"
          >
            Get Started
          </Link>
          <button className="px-8 py-3 border border-gray-300 text-black rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200">
            Learn More
          </button>
        </div>

        {/* Google Play Badge */}
        <div className="mt-6">
          <p className="text-xs text-gray-600 mb-3">Available on</p>
          <img 
            src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
            alt="Get it on Google Play" 
            className="h-12 mx-auto"
          />
        </div>
      </div>

      {/* Soft background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gray-100/50 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-100/30 rounded-full -ml-48 mb-96 blur-3xl"></div>
      </div>
    </section>
  );
}
