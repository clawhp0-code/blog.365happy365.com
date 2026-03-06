import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PostGrid } from "@/components/blog/PostGrid";
import { getAllTags, getPostsByTag } from "@/lib/posts";
import { ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getAllTags().map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const tag = decodeURIComponent(tagSlug);
  return {
    title: `#${tag} - 태그`,
    description: `${tag} 태그가 달린 모든 글`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag: tagSlug } = await params;
  const tag = decodeURIComponent(tagSlug);
  const posts = getPostsByTag(tag);

  if (posts.length === 0) notFound();

  return (
    <Container className="py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-sunny-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        블로그로 돌아가기
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-6 h-6 text-coral-500" />
          <h1 className="font-serif font-bold text-4xl text-ink-900">{tag}</h1>
        </div>
        <p className="text-ink-500">{posts.length}개의 글</p>
      </div>

      <PostGrid posts={posts} />
    </Container>
  );
}
