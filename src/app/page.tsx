import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedPosts } from "@/components/home/FeaturedPosts";
import { RecentPosts } from "@/components/home/RecentPosts";
import { Container } from "@/components/layout/Container";
import { getFeaturedPosts, getRecentPosts } from "@/lib/posts";

export default function HomePage() {
  const featuredPosts = getFeaturedPosts(3);
  const recentPosts = getRecentPosts(6);

  return (
    <>
      <HeroSection />
      <Container className="py-4">
        <FeaturedPosts posts={featuredPosts} />
        <RecentPosts posts={recentPosts} />
      </Container>
    </>
  );
}
