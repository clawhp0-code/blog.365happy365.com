import { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return {
    title: dict.privacy.title,
    description: dict.privacy.description,
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);

  return (
    <main className="flex-1">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">{dict.privacy.title}</h1>
        <div className="prose prose-warm max-w-none">
          <p className="text-gray-600 mb-8">
            {dict.privacy.lastModified} {new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US")}
          </p>

          <h2>{dict.privacy.section1Title}</h2>
          <p>{dict.privacy.section1Body}</p>
          <ul>
            {dict.privacy.section1Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <h2>{dict.privacy.section2Title}</h2>
          <p>{dict.privacy.section2Body1}</p>
          <p>{dict.privacy.section2Body2}</p>
          <ul>
            <li>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                {dict.privacy.section2Link1}
              </a>
            </li>
            <li>
              <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">
                {dict.privacy.section2Link2}
              </a>
            </li>
          </ul>

          <h2>{dict.privacy.section3Title}</h2>
          <p>{dict.privacy.section3Body}</p>

          <h2>{dict.privacy.section4Title}</h2>
          <p>{dict.privacy.section4Body}</p>

          <h2>{dict.privacy.section5Title}</h2>
          <p>{dict.privacy.section5Body}</p>
          <ul>
            {dict.privacy.section5Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <h2>{dict.privacy.section6Title}</h2>
          <p>{dict.privacy.section6Body}</p>

          <h2>{dict.privacy.section7Title}</h2>
          <p>{dict.privacy.section7Body}</p>
          <ul>
            {dict.privacy.section7Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p>{dict.privacy.section7Footer}</p>

          <h2>{dict.privacy.section8Title}</h2>
          <p>{dict.privacy.section8Body}</p>

          <h2>{dict.privacy.section9Title}</h2>
          <p>{dict.privacy.section9Body}</p>

          <h2>{dict.privacy.section10Title}</h2>
          <p>{dict.privacy.section10Body}</p>
          <ul>
            <li>
              <a href="mailto:contact@blog.365happy365.com">
                contact@blog.365happy365.com
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
