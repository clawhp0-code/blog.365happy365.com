import { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return {
    title: dict.contact.title,
    description: dict.contact.description,
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);

  return (
    <main className="flex-1">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">{dict.contact.title}</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">{dict.contact.heading}</h2>
            <p className="text-gray-700 mb-6">{dict.contact.body}</p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <p className="text-gray-600 mb-2">{dict.contact.email}</p>
              <a
                href="mailto:blog@365happy365.com"
                className="text-amber-600 hover:text-amber-700 font-medium text-lg break-all"
              >
                blog@365happy365.com
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{dict.contact.responseTitle}</h2>
            <p className="text-gray-700">{dict.contact.responseBody}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{dict.contact.examplesTitle}</h2>
            <ul className="space-y-3 text-gray-700">
              {[dict.contact.example1, dict.contact.example2, dict.contact.example3, dict.contact.example4].map((example, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-amber-600 mr-3">•</span>
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">{dict.contact.privacyTitle}</h2>
            <p className="text-gray-700 mb-4">{dict.contact.privacyBody}</p>
            <a
              href={`/${locale}/privacy`}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              {dict.contact.privacyLink}
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
