import { CheckCircle2 } from "lucide-react";

const points = [
  "A calmer brand palette aligned with the new SY Data identity",
  "Shared visual language between landing page, dashboard and auth screens",
  "Asset pipeline for logo, favicons and social sharing images",
];

export function PremiumValueSection() {
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="rounded-[2rem] border border-sky-100 bg-[linear-gradient(145deg,#ffffff_0%,#f3fbff_50%,#eef8ff_100%)] p-8 shadow-[0_22px_70px_rgba(16,32,77,0.08)]">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Brand system</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950">
            One identity, carried through every screen.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Your uploaded mark becomes the anchor for the site chrome, favicons, app iconography and
            homepage storytelling. The result feels like one product, not two disconnected pages.
          </p>
          <div className="mt-8 space-y-4">
            {points.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-2xl border border-white bg-white/80 px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-500" />
                <div className="text-sm leading-7 text-slate-700">{point}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-[linear-gradient(160deg,#173B88_0%,#198EC0_48%,#7AC955_100%)] p-8 text-white shadow-[0_24px_80px_rgba(23,59,136,0.22)]">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-white/75">What changes now</div>
          <div className="mt-8 grid gap-5">
            {[
              ["Landing route", "Root route now acts as the marketing surface instead of redirecting immediately."],
              ["App route", "Transactional dashboard remains available under /app for signed-in use."],
              ["Brand assets", "Favicon, app icons, social image and square logo are generated from the same mark."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="text-lg font-bold">{title}</div>
                <div className="mt-2 text-sm leading-7 text-sky-50/90">{copy}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
