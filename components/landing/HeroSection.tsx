import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Smartphone, Zap } from "lucide-react";

const highlights = [
  "Instant data and airtime delivery",
  "Wallet funding with reserved account",
  "Cable TV and electricity in one app",
];

const stats = [
  { value: "24/7", label: "always-on checkout" },
  { value: "4", label: "major networks" },
  { value: "60s", label: "average delivery" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(25,142,192,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(121,201,78,0.18),transparent_26%),linear-gradient(180deg,#f7fcff_0%,#ffffff_58%,#eef8ff_100%)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-16 px-5 py-18 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            SY Data keeps you connected without the stress.
          </div>
          <h1 className="max-w-3xl text-5xl font-black tracking-[-0.05em] text-slate-950 sm:text-6xl">
            Data, airtime and bill payments built around speed.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Fast checkout, clean pricing, and a wallet flow that fits how Nigerian users actually buy
            data. SY Data handles airtime, cable TV and electricity from one account.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/app/auth"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1C3E88,#198EC0_58%,#79C94E)] px-6 py-3.5 text-base font-semibold text-white shadow-[0_18px_44px_rgba(28,62,136,0.22)] transition hover:translate-y-[-1px]"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Open dashboard
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <div
                key={item}
                className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-sm">
                <div className="text-3xl font-black tracking-[-0.05em] text-slate-950">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 translate-x-3 translate-y-5 rounded-[2rem] bg-[linear-gradient(135deg,rgba(28,62,136,0.16),rgba(25,142,192,0.10),rgba(121,201,78,0.16))] blur-2xl" />
          <div className="relative rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_28px_80px_rgba(16,32,77,0.12)]">
            <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#0f214c_0%,#153778_48%,#198ec0_100%)] p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/80">
                    SY Data Wallet
                  </div>
                  <div className="mt-2 text-3xl font-black">NGN 12,450.00</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                  <Image src="/brand/logo-mark.svg" alt="SY Data mark" width={52} height={52} />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <Zap className="h-4 w-4 text-emerald-300" />
                    Instant purchase
                  </div>
                  <p className="mt-2 text-sm leading-6 text-sky-50/80">
                    MTN SME 10GB delivered immediately after payment.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <Shield className="h-4 w-4 text-emerald-300" />
                    Secure funding
                  </div>
                  <p className="mt-2 text-sm leading-6 text-sky-50/80">
                    Dedicated account number ready for transfers and wallet top-up.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Smartphone className="h-5 w-5 text-sky-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Operator coverage</div>
                    <div className="text-sm text-slate-500">MTN, Airtel, Glo, 9mobile</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["MTN", "Airtel", "Glo", "9mobile"].map((network) => (
                    <span
                      key={network}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
                    >
                      {network}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  What users care about
                </div>
                <div className="mt-4 space-y-4">
                  {[
                    ["Transparent pricing", "No guessing. Know the amount before checkout."],
                    ["One clean account", "Use the same wallet for data, airtime and utility bills."],
                    ["Fast support flow", "WhatsApp-ready support and clear transaction records."],
                  ].map(([title, copy]) => (
                    <div key={title} className="rounded-2xl border border-slate-100 p-4">
                      <div className="font-semibold text-slate-900">{title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{copy}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
