import { SocialLinks } from '@/components/SocialLinks';

interface ContactInfoItem {
  emoji: string;
  key: string;
}

interface ContactInfoProps {
  contactInfo: ContactInfoItem[];
  t: (key: string) => string;
  responseTitle: string;
  responseDescription: string;
  socialTitle: string;
  infoTitle: string;
}

export function ContactInfo({
  contactInfo,
  t,
  responseTitle,
  responseDescription,
  socialTitle,
  infoTitle,
}: ContactInfoProps) {
  return (
    <div className="space-y-8">
      {/* Email Cards */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          {infoTitle}
        </h2>
        <div className="space-y-6">
          {contactInfo.map((info) => (
            <div key={info.key} className="flex items-start gap-4">
              <div className="text-3xl" aria-hidden="true">{info.emoji}</div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white mb-1">
                  {t(`info.${info.key}.title`)}
                </h3>
                <a
                  href={`mailto:${t(`info.${info.key}.email`)}`}
                  className="text-cyan-500 hover:text-cyan-600 transition-colors"
                >
                  {t(`info.${info.key}.email`)}
                </a>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {t(`info.${info.key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 shadow-xl">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          {socialTitle}
        </h2>
        <SocialLinks variant="grid" size="md" />
      </div>

      {/* Response Time */}
      <div className="bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl p-8 text-white">
        <h3 className="text-xl font-bold mb-2">{responseTitle}</h3>
        <p className="text-white/80">{responseDescription}</p>
      </div>
    </div>
  );
}
