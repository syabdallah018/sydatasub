"use client";

import { motion } from "framer-motion";
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
      "Data is delivered instantly to your line within seconds of purchase. Most users report receiving their data within 2-5 seconds. We guarantee delivery or your money back.",
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
      "Creating an account is simple: Download the app, enter your phone number, set a 6-digit PIN, and you're done! The entire process takes less than 60 seconds.",
  },
  {
    question: "Can I buy data without creating an account?",
    answer:
      "Yes! Guest purchases are available. Simply enter your phone number and recipient details without creating an account. However, creating an account gives you access to exclusive rewards and faster checkout.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="relative py-20 sm:py-32 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Section title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-slate-300">
            Got questions? We've got answers.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-slate-700/50 rounded-lg px-6 data-[state=open]:bg-slate-800/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-white hover:text-teal-400 transition-colors py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p className="text-slate-300 mb-4">Still have questions?</p>
          <a
            href="mailto:support@sydatasub.com"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors font-semibold"
          >
            Contact our support team →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
