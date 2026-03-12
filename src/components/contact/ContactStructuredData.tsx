interface ContactStructuredDataProps {
  locale: 'zh' | 'en';
  baseUrl: string;
  contactInfo: Array<{ key: string; emoji: string }>;
  t: (key: string) => string;
  description: string;
}

export function ContactStructuredData({
  locale,
  baseUrl,
  contactInfo,
  t,
  description,
}: ContactStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: locale === 'zh' ? "联系 7zi Studio" : "Contact 7zi Studio",
    description,
    url: `${baseUrl}/${locale}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: "7zi Studio",
      url: baseUrl,
      contactPoint: contactInfo.map((info) => ({
        "@type": "ContactPoint",
        contactType: t(`info.${info.key}.title`),
        email: t(`info.${info.key}.email`),
        description: t(`info.${info.key}.description`),
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
