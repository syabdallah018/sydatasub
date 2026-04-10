"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img 
              src="/logo.jpeg" 
              alt="SY DATA" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold text-black text-sm hidden sm:inline">
              SY DATA SUB
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-12">
            {[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "How it works", href: "#howitworks" },
              { label: "FAQ", href: "#faq" }
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 hover:text-black transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link
              href="/app"
              className="px-5 py-2 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors duration-200"
            >
              Open App
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 -mr-2 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-black" />
            ) : (
              <Menu className="w-5 h-5 text-black" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-gray-200/50 bg-white">
            <div className="flex flex-col py-2 space-y-1">
              {[
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "How it works", href: "#howitworks" },
                { label: "FAQ", href: "#faq" }
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-600 hover:text-black transition-colors duration-200 px-4 py-2"
                  onClick={closeMenu}
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-gray-200/50 mt-2 pt-2">
                <Link
                  href="/app"
                  className="block w-full px-4 py-2 bg-black text-white text-sm font-semibold text-center rounded-lg"
                  onClick={closeMenu}
                >
                  Open App
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
