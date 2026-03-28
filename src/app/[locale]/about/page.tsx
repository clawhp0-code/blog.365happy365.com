import { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { Sun, BookOpen, Lightbulb, Heart } from "lucide-react";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return {
    title: dict.about.title,
    description: `365happy365 ${dict.about.title}`,
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);

  return (
    <Container size="sm" className="py-16">
      <AnimatedSection>
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sunny-100 rounded-full mb-4">
            <Sun className="w-8 h-8 text-sunny-500" />
          </div>
          <h1 className="font-serif font-bold text-4xl text-ink-900 mb-4">{dict.about.title}</h1>
          <p className="text-xl text-ink-500">{dict.about.greeting}</p>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.1} className="prose prose-warm max-w-none font-serif">
        <div className="bg-white rounded-2xl p-8 border border-cream-200 mb-8">
          <h2 className="font-serif font-bold text-2xl text-ink-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sunny-500" />
            {dict.about.aboutBlog}
          </h2>
          <p className="text-ink-600 leading-relaxed mb-4">
            <strong>365happy365</strong> {dict.about.aboutDescription1}
          </p>
          <p className="text-ink-600 leading-relaxed">
            {dict.about.aboutDescription2}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-cream-200 mb-8">
          <h2 className="font-serif font-bold text-2xl text-ink-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-coral-500" />
            {dict.about.topics}
          </h2>
          <ul className="space-y-2 text-ink-600">
            <li>🔬 <strong>{locale === "ko" ? "과학" : "Science"}</strong> - {dict.about.topicScience.split(" - ")[1]}</li>
            <li>💻 <strong>{locale === "ko" ? "기술" : "Technology"}</strong> - {dict.about.topicTech.split(" - ")[1]}</li>
            <li>🌍 <strong>{locale === "ko" ? "문화" : "Culture"}</strong> - {dict.about.topicCulture.split(" - ")[1]}</li>
            <li>🧠 <strong>{locale === "ko" ? "심리학" : "Psychology"}</strong> - {dict.about.topicPsychology.split(" - ")[1]}</li>
            <li>📖 <strong>{locale === "ko" ? "일상" : "Daily Life"}</strong> - {dict.about.topicDaily.split(" - ")[1]}</li>
          </ul>
        </div>

        <div className="bg-sunny-50 rounded-2xl p-8 border border-sunny-200 text-center">
          <Heart className="w-8 h-8 text-coral-500 mx-auto mb-3" />
          <p className="text-ink-700 font-medium mb-4">
            {dict.about.contactCta}
          </p>
          <Button href={`/${locale}/blog`} variant="primary">
            {dict.about.startReading}
          </Button>
        </div>
      </AnimatedSection>
    </Container>
  );
}
