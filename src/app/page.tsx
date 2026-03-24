import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedPosts } from "@/components/home/FeaturedPosts";
import { RecentPosts } from "@/components/home/RecentPosts";
import { VisitorCounter } from "@/components/ui/VisitorCounter";
import { RecentPostsWidget } from "@/components/sidebar/RecentPostsWidget";
import { TagCloudWidget } from "@/components/sidebar/TagCloudWidget";
import { CalendarWidget } from "@/components/sidebar/CalendarWidget";
import { ArchiveWidget } from "@/components/sidebar/ArchiveWidget";
import { getFeaturedPosts, getRecentPosts, getAllTags, getArchives } from "@/lib/posts";

export default function HomePage() {
  const featuredPosts = getFeaturedPosts(3);
  const recentPosts = getRecentPosts(6);
  const sidebarRecentPosts = getRecentPosts(5);
  const tags = getAllTags();
  const archives = getArchives();

  return (
    <>
      <HeroSection />
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <RecentPosts posts={recentPosts} />
            <FeaturedPosts posts={featuredPosts} />
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              <VisitorCounter />
              <RecentPostsWidget posts={sidebarRecentPosts} />
              <TagCloudWidget tags={tags} />
              <CalendarWidget />
              <ArchiveWidget archives={archives} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
