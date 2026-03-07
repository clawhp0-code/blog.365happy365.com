import Link from "next/link";
import Image from "next/image";
import { type Post } from "contentlayer2/generated";
import { formatDate } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps) {
  return (
    <article className="group bg-white rounded-lg overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300">
      {post.coverImage && (
        <Link href={post.url} className="block aspect-video overflow-hidden">
          <Image
            src={post.coverImage}
            alt={post.title}
            width={600}
            height={338}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
      )}
      <div className="p-4 sm:p-[16px_18px_20px]">
        <h3 className="font-heading font-bold text-[1.05rem] leading-snug text-[#333333] mb-2 line-clamp-2">
          <Link
            href={post.url}
            className="hover:text-[#607D8B] transition-colors"
          >
            {post.title}
          </Link>
        </h3>
        {post.description && (
          <p className="text-[0.88rem] leading-relaxed text-[#555555] mb-3 line-clamp-3">
            {post.description}
          </p>
        )}
        <span className="text-[0.78rem] text-[#999999]">
          {formatDate(post.date)}
        </span>
      </div>
    </article>
  );
}
