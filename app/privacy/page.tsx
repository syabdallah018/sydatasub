"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, Shield, Lock, Eye, Users, FileText, AlertCircle } from "lucide-react";

const T = {
  bg: "#ffffff",
  surface: "#f8f9fc",
  card: "#ffffff",
  border: "#e5e7eb",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  blueBorder: "rgba(37, 99, 235, 0.2)",
  text: "#1f2937",
  textMid: "#6b7280",
  textDim: "#9ca3af",
  font: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
};

export default function PrivacyPage() {
  const router = useRouter();

  const sections = [
    {
      icon: <Shield size={24} />,
      title: "Data Protection",
      content: "Your personal data is encrypted and secured using industry-standard security protocols. We do not share your information with third parties without consent."
    },
    {
      icon: <Lock size={24} />,
      title: "Account Security",
      content: "Your PIN is hashed and never stored in plaintext. All sensitive transactions are protected with end-to-end encryption."
    },
    {
      icon: <Eye size={24} />,
      title: "Information We Collect",
      content: "We collect: Full name, phone number, email (optional), transaction history, IP address, and device information for service improvement and fraud prevention."
    },
    {
      icon: <Users size={24} />,
      title: "Third-Party Services",
      content: "We use BillStack for reserved-account payment processing. Visit their privacy policy for details on how they handle your data. Network providers may receive your phone number for service delivery."
    },
    {
      icon: <FileText size={24} />,
      title: "Data Retention",
      content: "We retain your account data for 7 years after the last transaction for regulatory compliance. You can request deletion of your account anytime."
    },
    {
      icon: <AlertCircle size={24} />,
      title: "Your Rights",
      content: "You have the right to access, correct, or delete your personal data. Contact support@sydatasub.com for data access requests or privacy concerns."
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "sticky", top: 0, zIndex: 40, background: `rgba(255,255,255,0.9)`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.blueBorder}`, boxShadow: `0 4px 12px ${T.blue}15` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 11, background: T.surface, border: `1.5px solid ${T.blueBorder}`, fontFamily: T.font, fontWeight: 600, fontSize: 12, color: T.blue, cursor: "pointer", transition: "all 0.2s" }}>
            <ChevronLeft size={16} /> Back
          </motion.button>
          <h1 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 24, color: T.text, margin: 0 }}>Privacy Policy</h1>
          <div style={{ width: 120 }} />
        </div>
      </motion.div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: T.blueLight, border: `2px solid ${T.blueBorder}`, borderRadius: 20, padding: "24px", marginBottom: 40 }}>
          <h2 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 18, color: T.blue, margin: "0 0 12px" }}>Your Privacy Matters</h2>
          <p style={{ fontFamily: T.font, fontWeight: 400, fontSize: 14, color: T.textMid, margin: 0, lineHeight: 1.6 }}>
            SY DATA SUB is committed to protecting your privacy. This policy explains how we collect, use, and protect your information when you use our services.
          </p>
        </motion.div>

        {/* Sections */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginBottom: 40 }}>
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{
                background: T.card,
                border: `1.5px solid ${T.blueBorder}`,
                borderRadius: 16,
                padding: "20px",
                display: "flex",
                gap: 16,
              }}
            >
              <div style={{ color: T.blue, flexShrink: 0, marginTop: 4 }}>
                {section.icon}
              </div>
              <div>
                <h3 style={{ fontFamily: T.font, fontWeight: 700, fontSize: 16, color: T.text, margin: "0 0 8px" }}>
                  {section.title}
                </h3>
                <p style={{ fontFamily: T.font, fontWeight: 400, fontSize: 14, color: T.textMid, margin: 0, lineHeight: 1.6 }}>
                  {section.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px", textAlign: "center" }}>
          <p style={{ fontFamily: T.font, fontSize: 12, color: T.textDim, margin: 0, lineHeight: 1.6 }}>
            Last updated: April 2026 | For questions, contact{" "}
            <span style={{ fontWeight: 600, color: T.blue }}>privacy@sydatasub.com</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
