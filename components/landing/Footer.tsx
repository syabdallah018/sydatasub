"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-6 flex items-center gap-2">
              <span className="text-sm font-semibold">SY DATA SUB</span>
            </Link>
            <p className="text-sm text-gray-400">
              Fast, reliable, affordable mobile data for Nigeria.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-sm text-gray-400 transition-colors hover:text-white">Features</a></li>
              <li><a href="#pricing" className="text-sm text-gray-400 transition-colors hover:text-white">Pricing</a></li>
              <li><a href="#howitworks" className="text-sm text-gray-400 transition-colors hover:text-white">How it Works</a></li>
              <li><a href="#faq" className="text-sm text-gray-400 transition-colors hover:text-white">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-gray-400 transition-colors hover:text-white">About</Link></li>
              <li><Link href="/" className="text-sm text-gray-400 transition-colors hover:text-white">Contact</Link></li>
              <li><Link href="/" className="text-sm text-gray-400 transition-colors hover:text-white">Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-gray-400 transition-colors hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/" className="text-sm text-gray-400 transition-colors hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="https://www.anjalventures.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-white"
              >
                <span className="text-sm font-semibold sm:text-base">Built by Anjal Ventures</span>
                <img
                  src="https://anjalventures.com/logo.png"
                  alt="Anjal Ventures"
                  className="h-10 w-10 rounded-md bg-white p-1 object-contain"
                />
              </a>
              <a
                href="https://wa.me/2348164135836"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-green-500 sm:text-base"
              >
                Chat on WhatsApp
              </a>
            </div>

            <p className="text-xs text-gray-400 sm:text-sm">© {currentYear} SY DATA SUB. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
