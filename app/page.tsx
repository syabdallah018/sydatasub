"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Code, 
  Cpu, 
  Database, 
  CheckCircle, 
  Terminal, 
  Smartphone, 
  Lock, 
  Layers, 
  Check,
  ChevronRight,
  HelpCircle,
  Copy
} from "lucide-react";
import { toast } from "sonner";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"plans" | "purchase" | "balance">("plans");
  const [copied, setCopied] = useState(false);
  const [activePlans, setActivePlans] = useState<any[]>([]);

  // Check if redirected from /app with install query
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("install") === "true") {
        toast.info("For the best experience and full security, please use our official Android app. Install it below to get started.");
        document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  // Fetch real plans from database on load to display dynamically in plans sandbox
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          if (data.plans && Array.isArray(data.plans)) {
            // Keep first 3 plans for concise, readable sandbox response
            setActivePlans(data.plans.slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Failed to prefetch real plans:", err);
      }
    };
    loadPlans();
  }, []);

  const copyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Endpoint copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sandboxPayloads: Record<
    "plans" | "purchase" | "balance",
    { method: string; url: string; desc: string; body?: string; response: string }
  > = {
    plans: {
      method: "GET",
      url: "/api/plans",
      desc: "Fetch the full list of currently active mobile data plans across all supported networks. Each plan includes a unique integer ID you can use directly in purchase requests.",
      response: JSON.stringify({
        success: true,
        plans: activePlans.length > 0 ? activePlans : [
          {
            id: 125,
            name: "MTN SME 1GB",
            network: "MTN",
            size: "1GB",
            price: 240
          }
        ]
      }, null, 2)
    },
    purchase: {
      method: "POST",
      url: "/api/data",
      desc: "Submit a data purchase order for any Nigerian phone number. The platform validates the request, deducts from your developer wallet, and delivers the bundle to the recipient in real time.",
      body: `{
  "phone": "08164135836",
  "networkId": 1,
  "planId": 125,
  "reference": "tx-unique-trace-983"
}`,
      response: `{
  "success": true,
  "reference": "tx-unique-trace-983",
  "externalReference": "API-C-7289139",
  "status": "SUCCESS",
  "message": "You have successfully transferred MTN SME 1GB to 08164135836"
}`
    },
    balance: {
      method: "GET",
      url: "/api/balance",
      desc: "Retrieve your current developer wallet balance in both Naira and Kobo. Use this to monitor available funds before processing high-volume purchase operations.",
      response: `{
  "success": true,
  "balance": 12540.50,
  "balanceKobo": 1254050,
  "currency": "NGN"
}`
    }
  };

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 selection:bg-teal-500/30 selection:text-teal-200">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-extrabold text-white text-lg tracking-tight">SY DATA SUB</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#developer" className="hover:text-white transition">Developers</a>
            <a href="#download" className="hover:text-white transition">Get Mobile App</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-full transition shadow-lg shadow-blue-500/20">
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Cpu size={12} /> Developer API Now Live
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight tracking-tight">
            Mobile data, delivered<br />
            <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">the moment you need it.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
            SY DATA SUB gives you fast, affordable access to mobile data and airtime across all major Nigerian networks. Whether you're topping up for yourself, running a reseller business, or building a product on our API — we make every transaction simple, instant, and reliable.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard" className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-blue-500/15">
              Get Started <ArrowRight size={16} />
            </Link>
            <a href="#developer" className="px-8 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl font-bold transition flex items-center justify-center gap-2">
              View API Docs
            </a>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto pt-10 border-t border-slate-900 text-center">
            <div>
              <div className="text-3xl font-extrabold text-white">50K+</div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white">1M+</div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Transactions Processed</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white">&lt; 3s</div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Average Delivery Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* API Sandbox Section */}
      <section id="developer" className="py-20 px-6 bg-slate-900/40 border-y border-slate-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Terminal size={14} /> Developer API
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Build powerful products on our data infrastructure
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              The SY DATA SUB API gives developers and resellers direct, programmatic access to our data vending platform. Whether you're automating bulk purchases, embedding data sales into your own app, or building a custom reseller portal — our clean, well-documented HTTP API makes integration straightforward and production-ready from day one.
            </p>
            <div className="space-y-3.5">
              {[
                "Secure API key authentication on every request",
                "Real-time webhook notifications on transaction updates",
                "Automatic network operator detection from phone number",
                "IP whitelisting for server-to-server security"
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
                  <CheckCircle size={16} className="text-teal-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sandbox Interactive Widget */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Widget Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/40 p-2 gap-1.5 select-none">
              {(["plans", "purchase", "balance"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === tab 
                      ? "bg-slate-800 text-white shadow" 
                      : "text-slate-500 hover:text-slate-350"
                  }`}
                >
                  {tab === "plans" ? "GET Plans" : tab === "purchase" ? "POST Purchase" : "GET Balance"}
                </button>
              ))}
            </div>

            {/* Sandbox details */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sandboxPayloads[activeTab].method === "GET" 
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                      : "bg-green-500/10 text-green-400 border border-green-500/20"
                  }`}>
                    {sandboxPayloads[activeTab].method}
                  </span>
                  <code className="text-xs text-slate-300 font-mono font-bold select-all">
                    {sandboxPayloads[activeTab].url}
                  </code>
                </div>
                <button 
                  onClick={() => copyEndpoint(sandboxPayloads[activeTab].url)}
                  className="text-slate-500 hover:text-slate-300 transition"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {sandboxPayloads[activeTab].desc}
              </p>

              {/* Code blocks */}
              <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                {sandboxPayloads[activeTab].body && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Request Body</span>
                    <pre className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 text-sky-300 overflow-x-auto">
                      {sandboxPayloads[activeTab].body}
                    </pre>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Sample Response</span>
                  <pre className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 text-emerald-400 overflow-x-auto">
                    {sandboxPayloads[activeTab].response}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Play Store App Section */}
      <section id="download" className="py-20 px-6 bg-slate-950">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Smartphone size={36} className="text-teal-400 mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Take SY DATA SUB everywhere with the Android app
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Our official Android app gives you the full SY DATA SUB experience on your phone — instant data purchases, real-time transaction history, push notifications for every vend, and a clean interface built for everyday use. Download it once and stay connected wherever you go.
          </p>

          <div className="pt-4">
            <a 
              href="https://play.google.com/store" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block hover:scale-102 transition"
            >
              <img 
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                alt="Install SY DATA SUB on Play Store" 
                className="h-16 mx-auto object-contain"
              />
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-slate-900/20 border-t border-slate-900">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <HelpCircle size={28} className="text-blue-400 mx-auto" />
            <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto pt-1">
              Everything you need to know before getting started. Can't find your answer here? Reach us through the dashboard support chat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-900 space-y-2">
              <h4 className="font-bold text-white text-sm">How quickly is data delivered after a purchase?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Almost immediately. Over 99% of transactions are fulfilled within seconds of being submitted. Our platform connects directly to network operator delivery systems, so there is no manual processing or delay on our end.
              </p>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-900 space-y-2">
              <h4 className="font-bold text-white text-sm">How do I get the mobile app?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap the Google Play badge in the section above to install our official Android app. Once installed, it opens directly to your personal dashboard where you can start purchasing immediately.
              </p>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-900 space-y-2">
              <h4 className="font-bold text-white text-sm">Where do I find my API key?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign in to the web dashboard, go to the Developer API tab, and select Generate API Key. Your key is tied to your account and can be regenerated at any time if you need to reset access.
              </p>
            </div>
            <div className="bg-slate-955 p-6 rounded-2xl border border-slate-850 space-y-2">
              <h4 className="font-bold text-teal-400 text-sm">Does the API support webhook notifications?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Yes. You can register a webhook URL in your account settings and we will send signed event payloads to your endpoint whenever a transaction status changes. This makes it easy to build real-time fulfilment flows without polling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 px-6 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="Logo" className="h-6 w-6 rounded object-contain" />
            <span className="font-bold text-slate-300">SY DATA SUB</span>
          </div>
          <div className="flex gap-8">
            <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <a href="#download" className="hover:text-slate-300">Download Android App</a>
            <Link href="/dashboard" className="hover:text-slate-300">Developer Portal</Link>
          </div>
          <div>
            &copy; 2026 SY DATA SUB. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
