import { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PostGrid } from "@/components/blog/PostGrid";
import { Pagination } from "@/components/blog/Pagination";
import { getPaginatedPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "블로그",
  description: "세상의 모든 궁금한 것들을 탐구하는 글 모음",
};

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;
  const { posts, totalPages, currentPage } = getPaginatedPosts(page, 9);

  return (
    <Container className="py-12">
      <div className="mb-10">
        <h1 className="font-serif font-bold text-4xl text-ink-900 mb-3">블로그</h1>
        <p className="text-ink-500">세상의 모든 궁금한 것들을 탐구합니다</p>
      </div>

      <PostGrid posts={posts} />
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/blog" />
    </Container>
  );
}
