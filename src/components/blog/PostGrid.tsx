import { type Post } from "contentlayer2/generated";
import { PostCard } from "./PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

interface PostGridProps {
  posts: Post[];
  featured?: boolean;
}

export function PostGrid({ posts, featured = false }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-ink-400">
        <p className="text-lg">아직 게시물이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post, index) => (
        <AnimatedSection key={post.slug} delay={index * 0.05}>
          <PostCard post={post} featured={featured} />
        </AnimatedSection>
      ))}
    </div>
  );
}
