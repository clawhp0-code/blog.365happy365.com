import { defineDocumentType, makeSource } from "contentlayer2/source-files";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `posts/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    date: { type: "date", required: true },
    category: { type: "string", required: true },
    tags: { type: "list", of: { type: "string" }, default: [] },
    featured: { type: "boolean", default: false },
    draft: { type: "boolean", default: false },
    coverImage: { type: "string" },
    locale: { type: "string", default: "ko" },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (post) =>
        post._raw.flattenedPath.replace("posts/", "").replace(/\.en$/, ""),
    },
    url: {
      type: "string",
      resolve: (post) => {
        const locale = (post.locale as string) || "ko";
        const slug = post._raw.flattenedPath.replace("posts/", "").replace(/\.en$/, "");
        return `/${locale}/blog/${slug}`;
      },
    },
    readingTime: {
      type: "number",
      resolve: (post) => {
        const wordsPerMinute = 200;
        const words = post.body.raw.trim().split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
      },
    },
  },
}));

export default makeSource({
  contentDirPath: "content",
  documentTypes: [Post],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: "github-light",
          onVisitLine(node: any) {
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["anchor"],
          },
        },
      ],
    ],
  },
});
