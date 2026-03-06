import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PostGrid } from "@/components/blog/PostGrid";
import { getAllCategories, getPostsByCategory } from "@/lib/posts";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return getAllCategories().map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = decodeURIComponent(categorySlug);
  return {
    title: `${category} - 카테고리`,
    description: `${category} 카테고리의 모든 글`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = decodeURIComponent(categorySlug);
  const posts = getPostsByCategory(category);

  if (posts.length === 0) notFound();

  return (
    <Container className="py-12">
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-sunny-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        카테고리 목록
      </Link>

      <div className="mb-10">
        <h1 className="font-serif font-bold text-4xl text-ink-900 mb-2">{category}</h1>
        <p className="text-ink-500">{posts.length}개의 글</p>
      </div>

      <PostGrid posts={posts} />
    </Container>
  );
}
