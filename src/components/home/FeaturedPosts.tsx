import { type Post } from "contentlayer2/generated";
import { PostCard } from "@/components/blog/PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface FeaturedPostsProps {
  posts: Post[];
  locale: Locale;
}

export function FeaturedPosts({ posts, locale }: FeaturedPostsProps) {
  if (posts.length === 0) return null;
  const dict = getDictionary(locale);

  return (
    <section className="py-8">
      <AnimatedSection className="mb-6">
        <h2 className="font-heading font-bold text-xl text-[#4A3728]">{dict.home.featuredPosts}</h2>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {posts.map((post, index) => (
          <AnimatedSection key={post.slug} delay={index * 0.1}>
            <PostCard post={post} featured locale={locale} />
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
