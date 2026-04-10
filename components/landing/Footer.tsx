"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, MessageCircle, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-slate-800 bg-gradient-to-t from-slate-950 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SD</span>
              </div>
              <span className="font-display font-bold text-white">
                SY DATA SUB
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Fast. Reliable. Affordable.
            </p>
            <div className="flex gap-4">
              <a
                href="https://twitter.com"
                className="text-slate-400 hover:text-teal-400 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me"
                className="text-slate-400 hover:text-teal-400 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                className="text-slate-400 hover:text-teal-400 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Heart className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">
              Product
            </h4>
            <ul className="space-y-2">
              {["Features", "Plans", "Security", "FAQ"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-teal-400 transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">
              Company
            </h4>
            <ul className="space-y-2">
              {["About", "Blog", "Press", "Careers"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-teal-400 transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Contact"].map(
                (link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-teal-400 transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="border-t border-slate-800 pt-8">
          <motion.div
            className="flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div>
              <span>
                Built by{" "}
                <a 
                  href="https://www.anjalventures.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-teal-400 transition-colors font-semibold"
                >
                  Anjal Ventures
                </a>
              </span>
            </div>
            <p>
              © {currentYear} SY DATA SUB. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-teal-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-teal-400 transition-colors">
                Terms of Service
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
