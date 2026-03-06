import { type Post } from "contentlayer2/generated";
import { PostCard } from "@/components/blog/PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { Clock } from "lucide-react";

interface RecentPostsProps {
  posts: Post[];
}

export function RecentPosts({ posts }: RecentPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="py-12 border-t border-cream-200">
      <AnimatedSection className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-coral-500" />
          <h2 className="font-serif font-bold text-2xl text-ink-900">최신 글</h2>
        </div>
        <Button href="/blog" variant="outline" size="sm">
          더 보기
        </Button>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <AnimatedSection key={post.slug} delay={index * 0.05}>
            <PostCard post={post} />
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
