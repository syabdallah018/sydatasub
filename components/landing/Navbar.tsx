"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "backdrop-blur-md bg-slate-950/80 border-b border-slate-800/50"
          : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SD</span>
            </div>
            <span className="font-display font-bold text-white hidden sm:inline">
              SY DATA SUB
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Plans", "FAQ"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-slate-300 hover:text-white transition-colors font-body text-sm"
              >
                {link}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link
              href="/app"
              className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-full font-body font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all duration-300"
            >
              Get App
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden pb-4 space-y-4"
          >
            {["Features", "Plans", "FAQ"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="block text-slate-300 hover:text-white transition-colors font-body text-sm py-2"
                onClick={() => setIsOpen(false)}
              >
                {link}
              </a>
            ))}
            <Link
              href="/app"
              className="block w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-full font-body font-semibold text-center"
              onClick={() => setIsOpen(false)}
            >
              Get App
            </Link>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
