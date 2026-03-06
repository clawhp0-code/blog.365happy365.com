import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Tag } from "lucide-react";
import { type Post } from "contentlayer2/generated";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps) {
  return (
    <article className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-cream-200 ${featured ? "ring-1 ring-sunny-200" : ""}`}>
      {post.coverImage && (
        <div className="relative h-48 overflow-hidden">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="category">{post.category}</Badge>
          {post.featured && <Badge variant="featured">추천</Badge>}
        </div>

        <h2 className="font-serif font-bold text-lg text-ink-900 mb-2 line-clamp-2 group-hover:text-sunny-700 transition-colors">
          <Link href={post.url}>{post.title}</Link>
        </h2>

        <p className="text-sm text-ink-500 line-clamp-2 mb-4">{post.description}</p>

        <div className="flex items-center gap-4 text-xs text-ink-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(post.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {post.readingTime}분
          </span>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.slice(0, 3).map((tag) => (
              <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                <Badge variant="tag">
                  <Tag className="w-2.5 h-2.5 mr-1 inline" />
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
