import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PostGrid } from "@/components/blog/PostGrid";
import { getAllTags, getPostsByTag } from "@/lib/posts";
import { getDictionary } from "@/lib/dictionaries";
import { locales, type Locale } from "@/lib/i18n";
import { ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";

interface TagPageProps {
  params: Promise<{ locale: string; tag: string }>;
}

export async function generateStaticParams() {
  const params: { locale: string; tag: string }[] = [];
  for (const locale of locales) {
    const tags = getAllTags(locale);
    for (const t of tags) {
      params.push({ locale, tag: t.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { locale, tag: tagSlug } = await params;
  const tag = decodeURIComponent(tagSlug);
  const dict = getDictionary(locale as Locale);
  return {
    title: `#${tag} - ${dict.tags.title}`,
    description: `#${tag}`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { locale, tag: tagSlug } = await params;
  const l = locale as Locale;
  const tag = decodeURIComponent(tagSlug);
  const posts = getPostsByTag(tag, l);
  const dict = getDictionary(l);

  if (posts.length === 0) notFound();

  return (
    <Container className="py-12">
      <Link
        href={`/${locale}/blog`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-sunny-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {dict.tags.backToBlog}
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-6 h-6 text-coral-500" />
          <h1 className="font-serif font-bold text-4xl text-ink-900">{tag}</h1>
        </div>
        <p className="text-ink-500">{posts.length}{dict.blog.postsCount}</p>
      </div>

      <PostGrid posts={posts} locale={l} />
    </Container>
  );
}
