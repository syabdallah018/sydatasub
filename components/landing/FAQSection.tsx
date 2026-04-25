const faqs = [
  {
    question: "Can users still go straight into the dashboard?",
    answer:
      "Yes. The transactional product remains at /app, while the root route now works as the branded landing page.",
  },
  {
    question: "Will the logo appear inside auth and app pages too?",
    answer:
      "Yes. The same SY Data mark is wired into shared logo components, metadata, favicons and auth branding.",
  },
  {
    question: "Are these sample plans the real ones?",
    answer:
      "The landing page uses example cards for presentation. Actual live plans still come from your admin-managed app data.",
  },
  {
    question: "Can the generated assets be reused for stores and social cards?",
    answer:
      "Yes. The asset script produces square icons, an Apple touch icon and a wide Open Graph image from the same brand source.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">FAQ</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950">
            Straight answers before you ship.
          </h2>
        </div>
        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[1.5rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] px-6 py-5 shadow-sm"
            >
              <summary className="cursor-pointer list-none text-left text-lg font-bold text-slate-950">
                {faq.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
