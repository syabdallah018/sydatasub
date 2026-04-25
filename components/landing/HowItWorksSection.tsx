import { ArrowDownToLine, Database, Wallet } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Create account and fund wallet",
    body: "Sign up, get your reserved account, and move money in without friction.",
  },
  {
    icon: Database,
    title: "Choose plan or utility",
    body: "Select network, airtime, cable or power from the same clean dashboard.",
  },
  {
    icon: ArrowDownToLine,
    title: "Receive confirmation instantly",
    body: "Orders are processed fast and every transaction stays visible in your history.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-slate-950 py-20 text-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">
            How it works
          </div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">
            Simple enough for first-time users, structured enough for repeat use.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            The route to value is short: fund, buy, confirm. That logic now carries from the landing
            story into the app itself.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-white/10 p-3 text-sky-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-slate-400">0{index + 1}</div>
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{step.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
