"use client";

import { useTranslations } from "next-intl";

interface ContactInfoItem {
  emoji: string;
  key: string;
}

const contactInfo: ContactInfoItem[] = [
  { emoji: "📧", key: "business" },
  { emoji: "💻", key: "support" },
  { emoji: "🤝", key: "careers" },
];

interface ContactInfoProps {
  className?: string;
}

export function ContactInfo({ className = "" }: ContactInfoProps) {
  const tContact = useTranslations("contact");

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl ${className}`}>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
        {tContact("info.title")}
      </h2>
      <div className="space-y-6">
        {contactInfo.map((info) => (
          <div key={info.key} className="flex items-start gap-4">
            <div className="text-3xl" aria-hidden="true">
              {info.emoji}
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-1">
                {tContact(`info.${info.key}.title`)}
              </h3>
              <a
                href={`mailto:${tContact(`info.${info.key}.email`)}`}
                className="text-cyan-500 hover:text-cyan-600 transition-colors"
              >
                {tContact(`info.${info.key}.email`)}
              </a>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {tContact(`info.${info.key}.description`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContactInfo;
