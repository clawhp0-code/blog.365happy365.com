import { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PostGrid } from "@/components/blog/PostGrid";
import { Pagination } from "@/components/blog/Pagination";
import { getPaginatedPosts } from "@/lib/posts";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface BlogPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return {
    title: dict.nav.blog,
    description: dict.blog.description,
  };
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const { locale } = await params;
  const l = locale as Locale;
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;
  const { posts, totalPages, currentPage } = getPaginatedPosts(page, 9, l);
  const dict = getDictionary(l);

  return (
    <Container className="py-12">
      <div className="mb-10">
        <h1 className="font-serif font-bold text-4xl text-ink-900 mb-3">{dict.blog.title}</h1>
        <p className="text-ink-500">{dict.blog.description}</p>
      </div>

      <PostGrid posts={posts} locale={l} />
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath={`/${locale}/blog`} locale={l} />
    </Container>
  );
}
