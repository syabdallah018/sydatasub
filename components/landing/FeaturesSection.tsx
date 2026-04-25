import { CreditCard, Gauge, Receipt, Shield } from "lucide-react";

const features = [
  {
    icon: Gauge,
    title: "Fast order flow",
    description:
      "A clean checkout path for buying data and airtime in seconds without unnecessary steps.",
  },
  {
    icon: CreditCard,
    title: "Wallet + reserved account",
    description:
      "Users can fund once, buy repeatedly, and track every payment from the same dashboard.",
  },
  {
    icon: Receipt,
    title: "More than just data",
    description:
      "Support cable TV and electricity payments so the platform feels useful every day.",
  },
  {
    icon: Shield,
    title: "Structured and secure",
    description:
      "Clear account history, PIN-based auth, and controlled transaction routes for better trust.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Why SY Data</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950">
            Practical fintech design, not clutter.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            The brand is light, direct and trustworthy. That same direction carries through the landing
            page and the transactional app experience.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] p-6 shadow-[0_16px_50px_rgba(16,32,77,0.06)] transition hover:-translate-y-1 hover:shadow-[0_22px_65px_rgba(16,32,77,0.12)]"
              >
                <div className="inline-flex rounded-2xl bg-[linear-gradient(135deg,#1C3E88,#198EC0,#79C94E)] p-3 text-white shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
