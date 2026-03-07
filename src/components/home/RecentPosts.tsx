import { type Post } from "contentlayer2/generated";
import { PostCard } from "@/components/blog/PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";

interface RecentPostsProps {
  posts: Post[];
}

export function RecentPosts({ posts }: RecentPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="py-8 border-t border-[#E8E2D9]">
      <AnimatedSection className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-xl text-[#4A3728]">최신 글</h2>
        <Button href="/blog" variant="outline" size="sm">
          더 보기
        </Button>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {posts.map((post, index) => (
          <AnimatedSection key={post.slug} delay={index * 0.05}>
            <PostCard post={post} />
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
