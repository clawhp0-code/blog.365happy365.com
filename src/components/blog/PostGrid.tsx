import { type Post } from "contentlayer2/generated";
import { PostCard } from "./PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import type { Locale } from "@/lib/i18n";

interface PostGridProps {
  posts: Post[];
  featured?: boolean;
  locale?: Locale;
}

export function PostGrid({ posts, featured = false, locale = "ko" }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-ink-400">
        <p className="text-lg">{locale === "en" ? "No posts yet." : "아직 게시물이 없습니다."}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post, index) => (
        <AnimatedSection key={post.slug} delay={index * 0.05}>
          <PostCard post={post} featured={featured} locale={locale} />
        </AnimatedSection>
      ))}
    </div>
  );
}
