import { type Post } from "contentlayer2/generated";
import { PostCard } from "@/components/blog/PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

interface FeaturedPostsProps {
  posts: Post[];
}

export function FeaturedPosts({ posts }: FeaturedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="py-12">
      <AnimatedSection className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sunny-500" />
          <h2 className="font-serif font-bold text-2xl text-ink-900">추천 글</h2>
        </div>
        <Button href="/blog" variant="outline" size="sm">
          전체 보기
        </Button>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, index) => (
          <AnimatedSection key={post.slug} delay={index * 0.1}>
            <PostCard post={post} featured />
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
