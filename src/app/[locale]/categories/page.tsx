import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { getAllCategories } from "@/lib/posts";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { Layers } from "lucide-react";

interface CategoriesPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: CategoriesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return {
    title: dict.categories.title,
    description: dict.categories.description,
  };
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { locale } = await params;
  const l = locale as Locale;
  const categories = getAllCategories(l);
  const dict = getDictionary(l);

  return (
    <Container className="py-12">
      <div className="mb-10">
        <h1 className="font-serif font-bold text-4xl text-ink-900 mb-3">{dict.categories.title}</h1>
        <p className="text-ink-500">{dict.categories.description}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {categories.map((category, index) => (
          <AnimatedSection key={category.slug} delay={index * 0.05}>
            <Link
              href={`/${locale}/categories/${category.slug}`}
              className="group flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-cream-200 hover:border-sunny-300 hover:shadow-md transition-all duration-200 text-center"
            >
              <Layers className="w-8 h-8 text-sunny-400 mb-3 group-hover:text-sunny-500 transition-colors" />
              <h2 className="font-semibold text-ink-800 group-hover:text-sunny-700 transition-colors mb-1">
                {category.name}
              </h2>
              <p className="text-sm text-ink-400">{category.count}{dict.blog.postsCount}</p>
            </Link>
          </AnimatedSection>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-center text-ink-400 py-16">{dict.categories.empty}</p>
      )}
    </Container>
  );
}
