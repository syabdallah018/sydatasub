"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  BadgeDollarSign,
  Globe,
  ShieldCheck,
  TrendingUp,
  HeadphonesIcon,
  CheckCircle,
  Terminal,
  Smartphone,
  HelpCircle,
  Copy,
  ChevronDown,
  Cpu,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

/* ─── network brand colours ─── */
const NET: Record<string, { bg: string; text: string; accent: string }> = {
  MTN:     { bg: "#FFF9E6", text: "#CC8400", accent: "#FFCC00" },
  AIRTEL:  { bg: "#FFF0F0", text: "#CC0000", accent: "#FF0000" },
  GLO:     { bg: "#EAFFF0", text: "#006B23", accent: "#00B33C" },
  "9MOBILE": { bg: "#F0FFF0", text: "#2E6B2E", accent: "#4CAF50" },
};

interface Plan {
  id: string;
  name: string;
  network: string;
  size: string;
  validity: string;
  user_price: number;
  agent_price: number;
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"plans" | "purchase" | "balance">("plans");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("install") === "true") {
        toast.info(
          "For the best experience and full security, please use our official Android app. Install it below to get started."
        );
        setTimeout(() => document.getElementById("download")?.scrollIntoView({ behavior: "smooth" }), 400);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/plans");
        if (!res.ok) return;
        const data = await res.json();
        if (data.plans) setPlans(data.plans);
      } catch { /* silent */ }
    })();
  }, []);

  const copyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  /* group plans: 3 per network */
  const grouped: Record<string, Plan[]> = {};
  for (const p of plans) {
    const net = (p.network || "").toUpperCase();
    if (!grouped[net]) grouped[net] = [];
    if (grouped[net].length < 3) grouped[net].push(p);
  }

  const sandboxPayloads: Record<
    "plans" | "purchase" | "balance",
    { method: string; url: string; desc: string; body?: string; response: string }
  > = {
    plans: {
      method: "GET",
      url: "/api/plans",
      desc: "Fetch the full list of currently active mobile data plans across all supported networks.",
      response: JSON.stringify(
        { success: true, plans: plans.slice(0, 2).map((p) => ({ id: p.id, name: p.name, network: p.network, size: p.size, price: p.user_price })) },
        null,
        2
      ),
    },
    purchase: {
      method: "POST",
      url: "/api/data",
      desc: "Submit a data purchase order for any Nigerian phone number.",
      body: `{
  "phone": "08012345678",
  "networkId": 1,
  "planId": 125,
  "reference": "tx-unique-trace-983"
}`,
      response: `{
  "success": true,
  "reference": "tx-unique-trace-983",
  "externalReference": "API-C-7289139",
  "status": "SUCCESS",
  "message": "You have successfully transferred MTN SME 1GB to 08012345678"
}`,
    },
    balance: {
      method: "GET",
      url: "/api/balance",
      desc: "Retrieve your current developer wallet balance in both Naira and Kobo.",
      response: `{
  "success": true,
  "balance": 12540.50,
  "balanceKobo": 1254050,
  "currency": "NGN"
}`,
    },
  };

  const features = [
    {
      icon: <Zap size={22} />,
      title: "Instant data delivery",
      desc: "Buy data for MTN, Airtel, Glo, or 9Mobile and receive it within seconds. Our platform processes orders immediately and confirms delivery before you even leave the page. No waiting, no follow-ups required.",
    },
    {
      icon: <BadgeDollarSign size={22} />,
      title: "Prices that actually save you money",
      desc: "We offer some of the most competitive data plan rates in Nigeria. Whether you need a daily bundle, a weekly plan, or a large monthly allocation, you will find a package that fits your usage and your budget — without compromise.",
    },
    {
      icon: <Globe size={22} />,
      title: "All four major networks in one place",
      desc: "MTN, Airtel, Glo, and 9Mobile are all supported on a single platform. You do not need separate accounts or multiple apps — just select your network, enter your number, and complete your purchase in under a minute.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Every transaction is tracked and secure",
      desc: "Every purchase is logged to your account with a unique transaction reference and a full delivery confirmation. If anything ever goes wrong, you have a clear record to reference and a support team ready to resolve it.",
    },
    {
      icon: <TrendingUp size={22} />,
      title: "Built for resellers and high-volume buyers",
      desc: "Running a data reselling business? SY DATA SUB is designed to scale with you. Access bulk-friendly pricing, maintain a funded wallet for fast repeat orders, and manage all your transactions from one clean dashboard — no spreadsheets needed.",
    },
    {
      icon: <HeadphonesIcon size={22} />,
      title: "Support that responds when you need it",
      desc: "Our support team is reachable directly through the dashboard. Whether you have a question about a failed transaction, a billing concern, or just need help navigating the platform — we are here and we respond promptly.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Create your free account",
      desc: "Sign up in under two minutes. No identity documents required for standard purchases. Just your phone number and a password to get started.",
    },
    {
      num: "02",
      title: "Choose your plan and network",
      desc: "Browse live data plans across all four networks. Select the size, duration, and price that suits you — daily, weekly, or monthly bundles available.",
    },
    {
      num: "03",
      title: "Pay and receive instantly",
      desc: "Complete your payment and your data is delivered to the recipient phone number within seconds. A confirmation receipt is saved to your transaction history automatically.",
    },
  ];

  const faqs = [
    {
      q: "How quickly is data delivered after a purchase?",
      a: "Almost immediately. Over 99% of transactions are fulfilled within seconds of being submitted. Our platform connects directly to network operator delivery systems, so there is no manual processing or delay on our end. You will see a delivery confirmation in your transaction history as soon as it lands.",
    },
    {
      q: "Can I buy data for someone else's number?",
      a: "Yes. You can purchase data for any valid Nigerian phone number on any supported network — whether it is your own line, a family member's, a colleague's, or a customer you are serving as a reseller. Simply enter the recipient number at checkout and the bundle will be delivered directly to them.",
    },
    {
      q: "What happens if my transaction fails?",
      a: "In the rare event of a failed transaction, your wallet balance is not deducted and the order is automatically flagged in your transaction history. You can retry the purchase immediately or contact our support team through the dashboard and we will investigate and resolve it promptly.",
    },
    {
      q: "How do I get the mobile app?",
      a: "Tap the Google Play badge above to install our official Android app. Once installed, sign in with your existing SY DATA SUB account and your full purchase history, wallet balance, and account settings will be immediately available.",
    },
    {
      q: "Where do I find my API key?",
      a: "Sign in to the web dashboard, navigate to the Developer API tab, and select Generate API Key. Your key is unique to your account and can be regenerated at any time if you need to revoke or replace it for security reasons.",
    },
    {
      q: "Does the API support webhook notifications?",
      a: "Yes. You can register a webhook URL in your account settings and we will deliver signed event payloads to your endpoint the moment a transaction status changes — whether it succeeds, fails, or is pending confirmation. This makes it straightforward to build automated fulfilment pipelines without polling our API repeatedly.",
    },
  ];

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Developers", href: "#developer" },
    { label: "Get Mobile App", href: "#download" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.jpeg" alt="SY DATA SUB" className="h-9 w-9 rounded-xl object-contain shadow-sm" />
            <span className="font-extrabold text-lg tracking-tight text-gray-900 hidden sm:inline">SY DATA SUB</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition shadow-md shadow-blue-200"
            >
              Open App
            </Link>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-gray-600" aria-label="Menu">
              {mobileNav ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileNav && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileNav(false)}
                className="block text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-white">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          {/* Network chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {["MTN", "Airtel", "Glo", "9Mobile"].map((n) => (
              <span
                key={n}
                className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
                style={{
                  backgroundColor: NET[n.toUpperCase()]?.bg || "#f3f4f6",
                  color: NET[n.toUpperCase()]?.text || "#374151",
                }}
              >
                {n}
              </span>
            ))}
            <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide bg-gray-100 text-gray-500">
              All Networks Supported
            </span>
          </div>

          <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight text-gray-900 mb-6">
            Cheap data. Instant delivery.
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              Always available.
            </span>
          </h1>

          <p className="text-gray-500 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            SY DATA SUB is the fastest way to buy affordable mobile data and airtime in Nigeria. Top up your own number, gift a friend, or keep your whole family connected — on any network, from any device, at prices that make sense.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xl shadow-blue-200/50 flex items-center justify-center gap-2 text-[15px]"
            >
              Buy Data Now <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition flex items-center justify-center gap-2 text-[15px]"
            >
              See What We Offer
            </a>
          </div>

          {/* Google Play Badge — bold */}
          <div className="mb-12">
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:scale-[1.03] transition-transform"
            >
              <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                className="h-[60px] sm:h-[68px] mx-auto"
              />
            </a>
            <p className="text-[11px] text-gray-400 font-semibold mt-1">Also available on the web</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto pt-8 border-t border-gray-200">
            {[
              { val: "50K+", label: "Happy Customers" },
              { val: "1M+", label: "Successful Transactions" },
              { val: "< 3s", label: "Average Delivery Time" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{s.val}</div>
                <div className="text-[11px] text-gray-400 font-semibold mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-3xl -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-100/20 rounded-full blur-3xl -ml-48 pointer-events-none" />
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Everything you need to stay connected
            </h2>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              From a quick personal top-up to gifting data across the country — SY DATA SUB keeps it simple, affordable, and delivered in seconds. No queues. No agents. No drama.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-7 rounded-2xl border border-gray-100 bg-white hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-[15px] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-[13px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PLANS TABLE ═══════════════ */}
      {Object.keys(grouped).length > 0 && (
        <section id="pricing" className="py-20 px-6 bg-gray-50/80 border-y border-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                Live data plans — updated in real time
              </h2>
              <p className="text-gray-500 text-[15px]">
                A snapshot of our active plans across all networks. Prices shown are the standard user rate.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(grouped).map(([network, items]) => {
                const palette = NET[network] || NET.MTN;
                return (
                  <div key={network} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5" style={{ backgroundColor: palette.bg }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.accent }} />
                      <span className="font-extrabold text-sm tracking-wide" style={{ color: palette.text }}>
                        {network}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {items.map((p) => (
                        <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[13px] text-gray-900">{p.name}</div>
                            <div className="text-[11px] text-gray-400 font-medium mt-0.5">{p.validity}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-[15px] text-gray-900">₦{p.user_price?.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-6 py-3 bg-gray-50/60 text-center">
                      <Link href="/dashboard" className="text-blue-600 text-xs font-bold hover:underline">
                        View all {network} plans →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="howitworks" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">How it works</h2>
          </div>

          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-6 items-start py-8 border-b border-gray-100 last:border-b-0">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                  {s.num}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-[15px] mb-1.5">{s.title}</h3>
                  <p className="text-gray-500 text-[13px] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ DEVELOPER API ═══════════════ */}
      <section id="developer" className="py-20 sm:py-28 px-6 bg-gray-50/80 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 text-blue-600 text-[11px] font-bold uppercase tracking-widest">
                <Terminal size={14} /> Developer API
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Integrate data vending directly into your own product
              </h2>
              <p className="text-gray-500 text-[14px] leading-relaxed">
                The SY DATA SUB API is designed for developers, resellers, and businesses that want to automate data purchases at scale. Connect your app, website, or internal platform to our infrastructure and start dispensing data programmatically — with clean endpoints, real-time responses, and complete transaction traceability built in from the start.
              </p>
              <p className="text-gray-500 text-[14px] leading-relaxed">
                The API is production-ready, fully documented, and backed by the same delivery infrastructure that powers over one million transactions on our own platform.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  "Secure API key authentication on every request",
                  "Real-time webhook notifications on transaction updates",
                  "Automatic network operator detection from phone number",
                  "IP whitelisting for server-to-server security",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2.5 text-[13px] font-semibold text-gray-700">
                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Sandbox */}
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md">
              {/* tabs */}
              <div className="flex border-b border-gray-100 bg-gray-50 p-1.5 gap-1 select-none">
                {(["plans", "purchase", "balance"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {tab === "plans" ? "GET Plans" : tab === "purchase" ? "POST Purchase" : "GET Balance"}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {/* URL bar */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sandboxPayloads[activeTab].method === "GET"
                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                          : "bg-green-50 text-green-600 border border-green-100"
                      }`}
                    >
                      {sandboxPayloads[activeTab].method}
                    </span>
                    <code className="text-xs text-gray-700 font-mono font-bold">{sandboxPayloads[activeTab].url}</code>
                  </div>
                  <button onClick={() => copyEndpoint(sandboxPayloads[activeTab].url)} className="text-gray-400 hover:text-gray-600 transition">
                    <Copy size={14} />
                  </button>
                </div>

                <p className="text-xs text-gray-500">{sandboxPayloads[activeTab].desc}</p>

                {/* Code */}
                <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                  {sandboxPayloads[activeTab].body && (
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5 font-sans">Request Body</span>
                      <pre className="bg-slate-950 text-sky-300 p-4 rounded-xl overflow-x-auto">{sandboxPayloads[activeTab].body}</pre>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5 font-sans">Sample Response</span>
                    <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto">{sandboxPayloads[activeTab].response}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MOBILE APP ═══════════════ */}
      <section id="download" className="py-20 sm:py-28 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6">
            <Smartphone size={24} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Take SY DATA SUB everywhere with the Android app
          </h2>
          <p className="text-gray-500 text-[14px] leading-relaxed max-w-xl mx-auto mb-8">
            The SY DATA SUB Android app puts your entire account in your pocket. Buy data on the go, check your transaction history, get push notifications the moment your purchase is delivered, and top up any number from anywhere — all from a fast, lightweight app built for Nigerian network conditions. Install it once and you will never need to hunt for data credit again.
          </p>
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block hover:scale-[1.03] transition-transform"
          >
            <img
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              alt="Get it on Google Play"
              className="h-[64px] mx-auto"
            />
          </a>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section id="faq" className="py-20 sm:py-28 px-6 bg-gray-50/80 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Frequently Asked Questions</h2>
            <p className="text-gray-500 text-[14px]">
              Answers to the questions we hear most often. If yours is not listed here, open the dashboard and reach us through the support chat — we respond quickly.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-bold text-[14px] text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-[13px] text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-gray-100 py-10 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpeg" alt="Logo" className="h-7 w-7 rounded-lg object-contain" />
            <span className="font-extrabold text-gray-900 text-sm">SY DATA SUB</span>
          </div>
          <div className="flex gap-8 text-xs font-semibold text-gray-400">
            <Link href="/privacy" className="hover:text-gray-700 transition">Privacy Policy</Link>
            <a href="#download" className="hover:text-gray-700 transition">Download Android App</a>
            <Link href="/dashboard" className="hover:text-gray-700 transition">Developer Portal</Link>
          </div>
          <div className="text-xs text-gray-400">&copy; 2026 SY DATA SUB. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
