import Link from "next/link";
import { type Post } from "contentlayer2/generated";

interface RecentPostsWidgetProps {
  posts: Post[];
}

export function RecentPostsWidget({ posts }: RecentPostsWidgetProps) {
  return (
    <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
      <h3 className="font-heading font-bold text-sm text-[#4A3728] mb-3">최근에 올라온 글</h3>
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={post.url}
              className="text-[0.82rem] text-[#555555] hover:text-[#607D8B] transition-colors line-clamp-1 block"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
