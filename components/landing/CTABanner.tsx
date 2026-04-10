"use client";

import Link from "next/link";

export function CTABanner() {
  return (
    <section className="relative bg-black py-16 sm:py-20 px-6 sm:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Ready to get started?
        </h2>

        <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
          Join thousands of Nigerians who trust SY DATA SUB for fast, affordable mobile data.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/app"
            className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Open App
          </Link>
          <a
            href="https://play.google.com/store/apps/details?id=com.sydatasub"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            Get on Store
          </a>
        </div>
      </div>
    </section>
  );
}
