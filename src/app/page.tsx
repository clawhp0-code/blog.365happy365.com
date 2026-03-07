import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedPosts } from "@/components/home/FeaturedPosts";
import { RecentPosts } from "@/components/home/RecentPosts";
import { VisitorCounter } from "@/components/ui/VisitorCounter";
import { getFeaturedPosts, getRecentPosts } from "@/lib/posts";

export default function HomePage() {
  const featuredPosts = getFeaturedPosts(3);
  const recentPosts = getRecentPosts(6);

  return (
    <>
      <HeroSection />
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <FeaturedPosts posts={featuredPosts} />
            <RecentPosts posts={recentPosts} />
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-20">
              <VisitorCounter />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
