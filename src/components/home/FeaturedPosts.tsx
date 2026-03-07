import { type Post } from "contentlayer2/generated";
import { PostCard } from "@/components/blog/PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

interface FeaturedPostsProps {
  posts: Post[];
}

export function FeaturedPosts({ posts }: FeaturedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="py-8">
      <AnimatedSection className="mb-6">
        <h2 className="font-heading font-bold text-xl text-[#4A3728]">추천 글</h2>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {posts.map((post, index) => (
          <AnimatedSection key={post.slug} delay={index * 0.1}>
            <PostCard post={post} featured />
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
