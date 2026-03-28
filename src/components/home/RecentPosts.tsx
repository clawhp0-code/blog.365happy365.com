import { type Post } from "contentlayer2/generated";
import { PostCard } from "@/components/blog/PostCard";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface RecentPostsProps {
  posts: Post[];
  locale: Locale;
}

export function RecentPosts({ posts, locale }: RecentPostsProps) {
  if (posts.length === 0) return null;
  const dict = getDictionary(locale);

  return (
    <section className="py-8 border-t border-[#E8E2D9]">
      <AnimatedSection className="flex items-center justify-between mb-6">
        <h2 className="font-heading font-bold text-xl text-[#4A3728]">{dict.home.recentPosts}</h2>
        <Button href={`/${locale}/blog`} variant="outline" size="sm">
          {dict.home.viewMore}
        </Button>
      </AnimatedSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {posts.map((post, index) => (
          <AnimatedSection key={post.slug} delay={index * 0.05}>
            <PostCard post={post} locale={locale} />
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
