interface FAQItem {
  question: string;
  answer: string;
}

interface ContactFAQProps {
  title: string;
  items: FAQItem[];
}

export function ContactFAQ({ title, items }: ContactFAQProps) {
  return (
    <section className="py-20 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">
          {title}
        </h2>
        <div className="space-y-6">
          {items.map((faq, index) => (
            <details
              key={index}
              className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {faq.question}
                </span>
                <span className="ml-4 flex-shrink-0 text-cyan-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-6 pb-6 text-zinc-600 dark:text-zinc-400">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
