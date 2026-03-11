"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  className?: string;
}

export function FaqSection({ className = "" }: FaqSectionProps) {
  const tContact = useTranslations("contact");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = tContact.raw("faq.items") as FaqItem[] | undefined;

  if (!faqItems || faqItems.length === 0) {
    return null;
  }

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={`py-20 px-6 bg-white dark:bg-zinc-900 ${className}`}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">
          {tContact("faq.title")}
        </h2>
        <div className="space-y-6">
          {faqItems.map((faq, index) => (
            <div
              key={index}
              className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="flex items-center justify-between w-full p-6 text-left cursor-pointer"
                aria-expanded={openIndex === index}
              >
                <span className="font-medium text-zinc-900 dark:text-white">
                  {faq.question}
                </span>
                <span
                  className={`ml-4 flex-shrink-0 text-cyan-500 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;