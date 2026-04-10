"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How fast is data delivery?",
    answer:
      "Data is delivered instantly to your line within seconds of purchase. Most users receive their data within 2-5 seconds. We guarantee delivery or your money back.",
  },
  {
    question: "What networks do you support?",
    answer:
      "We support all major Nigerian networks: MTN, Glo, Airtel, and 9Mobile. Each network has a wide range of plans from daily to monthly packages.",
  },
  {
    question: "Is my money safe on SY DATA SUB?",
    answer:
      "Yes! All payments are secured by Flutterwave, one of Africa's leading payment processors. Your funds are protected with industry-standard encryption and security protocols.",
  },
  {
    question: "How do I create an account?",
    answer:
      "Creating an account is simple: Go to the app, enter your phone number, set a 6-digit PIN, and you're done. The entire process takes less than 60 seconds.",
  },
  {
    question: "Can I buy data without creating an account?",
    answer:
      "Yes! Guest purchases are available. Simply enter your phone number and recipient details without creating an account. However, creating an account gives you access to exclusive rewards.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="relative bg-white py-16 sm:py-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Find answers to common questions about SY DATA SUB.
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-b border-gray-200 py-4"
            >
              <AccordionTrigger className="text-left font-semibold text-black hover:text-gray-700 transition-colors text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base pt-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact section */}
        <div className="mt-12 text-center pt-12 border-t border-gray-200">
          <p className="text-gray-600 mb-4">
            Can't find what you're looking for?
          </p>
          <a
            href="mailto:support@sydatasub.com"
            className="inline-block text-black font-semibold hover:text-gray-700 transition-colors"
          >
            Contact our support team
          </a>
        </div>
      </div>
    </section>
  );
}
