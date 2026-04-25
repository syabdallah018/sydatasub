import Link from "next/link";

export function CTABanner() {
  return (
    <section className="pb-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,#173B88_0%,#198EC0_54%,#79C94E_100%)] px-8 py-10 text-white shadow-[0_26px_90px_rgba(23,59,136,0.22)] sm:px-10 md:px-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-white/75">Ready to launch</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">
                Put the new SY Data front door live.
              </h2>
              <p className="mt-4 text-lg leading-8 text-sky-50/90">
                Give new users a clear landing page, then move them into a consistent app experience that
                already carries the same brand assets.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/auth"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-sky-50"
              >
                Create account
              </Link>
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                Open app
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
