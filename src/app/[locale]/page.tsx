import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedPosts } from "@/components/home/FeaturedPosts";
import { RecentPosts } from "@/components/home/RecentPosts";
import { VisitorCounter } from "@/components/ui/VisitorCounter";
import { RecentPostsWidget } from "@/components/sidebar/RecentPostsWidget";
import { TagCloudWidget } from "@/components/sidebar/TagCloudWidget";
import { CalendarWidget } from "@/components/sidebar/CalendarWidget";
import { ArchiveWidget } from "@/components/sidebar/ArchiveWidget";
import { getFeaturedPosts, getRecentPosts, getAllTags, getArchives } from "@/lib/posts";
import type { Locale } from "@/lib/i18n";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const l = locale as Locale;
  const featuredPosts = getFeaturedPosts(3, l);
  const recentPosts = getRecentPosts(6, l);
  const sidebarRecentPosts = getRecentPosts(5, l);
  const tags = getAllTags(l);
  const archives = getArchives(l);

  return (
    <>
      <HeroSection locale={l} />
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <RecentPosts posts={recentPosts} locale={l} />
            <FeaturedPosts posts={featuredPosts} locale={l} />
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              <VisitorCounter />
              <RecentPostsWidget posts={sidebarRecentPosts} locale={l} />
              <TagCloudWidget tags={tags} locale={l} />
              <CalendarWidget locale={l} />
              <ArchiveWidget archives={archives} locale={l} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
