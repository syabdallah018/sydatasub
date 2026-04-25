const plans = [
  {
    network: "MTN SME",
    accent: "from-[#1C3E88] to-[#198EC0]",
    price: "₦3,550",
    volume: "10GB",
    note: "Good for daily work and streaming.",
  },
  {
    network: "Airtel CG",
    accent: "from-[#198EC0] to-[#79C94E]",
    price: "₦1,950",
    volume: "3GB",
    note: "Balanced option for top-ups on the move.",
  },
  {
    network: "Glo Smart",
    accent: "from-[#1460A8] to-[#79C94E]",
    price: "₦4,850",
    volume: "15GB",
    note: "Designed for heavier users who want value.",
  },
];

export function PlansSection() {
  return (
    <section id="plans" className="py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-[linear-gradient(180deg,#eff8ff_0%,#ffffff_100%)] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-8 md:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Popular picks</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950">
                Example plans with room for scale.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Showcase pricing cleanly, keep network choices visible, and let the dashboard handle the
                live catalog.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
              Final prices come from your admin-configured app plans.
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.network} className="rounded-[1.75rem] border border-white bg-white p-6 shadow-[0_20px_55px_rgba(16,32,77,0.08)]">
                <div className={`inline-flex rounded-full bg-gradient-to-r ${plan.accent} px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white`}>
                  {plan.network}
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-4xl font-black tracking-[-0.05em] text-slate-950">{plan.volume}</div>
                    <div className="mt-2 text-sm text-slate-500">{plan.note}</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{plan.price}</div>
                </div>
                <div className="mt-6 h-2 rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full bg-gradient-to-r ${plan.accent}`} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
