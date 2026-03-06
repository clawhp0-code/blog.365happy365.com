import { Metadata } from "next";
import { notFound } from "next/navigation";
import { useMDXComponent } from "next-contentlayer2/hooks";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { TOC } from "@/components/blog/TOC";
import { ScrollProgress } from "@/components/blog/ScrollProgress";
import { mdxComponents } from "@/components/mdx/MDXComponents";
import { formatDate } from "@/lib/utils";
import { getPostBySlug, getAllPosts } from "@/lib/posts";
import { Calendar, Clock, Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blog.365happy365.com";

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      url: `${siteUrl}${post.url}`,
      images: post.coverImage
        ? [{ url: post.coverImage }]
        : [{ url: `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function extractHeadings(raw: string) {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = headingRegex.exec(raw)) !== null) {
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ id, text, level: match[1].length });
  }
  return headings;
}

function PostContent({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const MDXContent = useMDXComponent(post.body.code);
  const headings = extractHeadings(post.body.raw);

  return (
    <>
      <ScrollProgress />
      <Container className="py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-sunny-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          블로그로 돌아가기
        </Link>

        <div className="flex gap-12">
          <article className="flex-1 min-w-0">
            {post.coverImage && (
              <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <header className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="category">{post.category}</Badge>
                {post.featured && <Badge variant="featured">추천</Badge>}
              </div>
              <h1 className="font-serif font-bold text-3xl md:text-4xl text-ink-900 mb-4 leading-tight">
                {post.title}
              </h1>
              <p className="text-lg text-ink-500 mb-6">{post.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-ink-400 pb-6 border-b border-cream-200">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readingTime}분 읽기
                </span>
              </div>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                      <Badge variant="tag">
                        <Tag className="w-3 h-3 mr-1 inline" />
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </header>

            <div className="prose prose-warm max-w-none font-serif">
              <MDXContent components={mdxComponents} />
            </div>
          </article>

          <TOC headings={headings} />
        </div>
      </Container>
    </>
  );
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  return <PostContent slug={slug} />;
}
