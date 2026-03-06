import { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { getAllCategories } from "@/lib/posts";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "카테고리",
  description: "주제별로 분류된 글 목록",
};

export default function CategoriesPage() {
  const categories = getAllCategories();

  return (
    <Container className="py-12">
      <div className="mb-10">
        <h1 className="font-serif font-bold text-4xl text-ink-900 mb-3">카테고리</h1>
        <p className="text-ink-500">주제별로 글을 탐색하세요</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {categories.map((category, index) => (
          <AnimatedSection key={category.slug} delay={index * 0.05}>
            <Link
              href={`/categories/${category.slug}`}
              className="group flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-cream-200 hover:border-sunny-300 hover:shadow-md transition-all duration-200 text-center"
            >
              <Layers className="w-8 h-8 text-sunny-400 mb-3 group-hover:text-sunny-500 transition-colors" />
              <h2 className="font-semibold text-ink-800 group-hover:text-sunny-700 transition-colors mb-1">
                {category.name}
              </h2>
              <p className="text-sm text-ink-400">{category.count}개의 글</p>
            </Link>
          </AnimatedSection>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-center text-ink-400 py-16">아직 카테고리가 없습니다.</p>
      )}
    </Container>
  );
}
