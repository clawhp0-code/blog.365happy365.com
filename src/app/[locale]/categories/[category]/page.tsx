import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PostGrid } from "@/components/blog/PostGrid";
import { getAllCategories, getPostsByCategory } from "@/lib/posts";
import { getDictionary } from "@/lib/dictionaries";
import { locales, type Locale } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CategoryPageProps {
  params: Promise<{ locale: string; category: string }>;
}

export async function generateStaticParams() {
  const params: { locale: string; category: string }[] = [];
  for (const locale of locales) {
    const cats = getAllCategories(locale);
    for (const cat of cats) {
      params.push({ locale, category: cat.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, category: categorySlug } = await params;
  const category = decodeURIComponent(categorySlug);
  const dict = getDictionary(locale as Locale);
  return {
    title: `${category} - ${dict.categories.title}`,
    description: `${category} ${dict.categories.title}`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, category: categorySlug } = await params;
  const l = locale as Locale;
  const category = decodeURIComponent(categorySlug);
  const posts = getPostsByCategory(category, l);
  const dict = getDictionary(l);

  if (posts.length === 0) notFound();

  return (
    <Container className="py-12">
      <Link
        href={`/${locale}/categories`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-sunny-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {dict.categories.backToCategories}
      </Link>

      <div className="mb-10">
        <h1 className="font-serif font-bold text-4xl text-ink-900 mb-2">{category}</h1>
        <p className="text-ink-500">{posts.length}{dict.blog.postsCount}</p>
      </div>

      <PostGrid posts={posts} locale={l} />
    </Container>
  );
}
