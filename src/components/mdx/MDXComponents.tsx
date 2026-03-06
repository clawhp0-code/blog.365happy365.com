import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Callout } from "./Callout";

export const mdxComponents = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className={cn("font-serif font-bold text-3xl mt-8 mb-4 text-ink-900", className)} {...props} />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={cn("font-serif font-bold text-2xl mt-8 mb-3 text-ink-900 border-b border-cream-200 pb-2", className)} {...props} />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn("font-serif font-semibold text-xl mt-6 mb-2 text-ink-800", className)} {...props} />
  ),
  h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className={cn("font-serif font-semibold text-lg mt-4 mb-2 text-ink-800", className)} {...props} />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("leading-7 mb-4 text-ink-700", className)} {...props} />
  ),
  a: ({ className, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith("/")) {
      return <Link href={href} className={cn("text-coral-600 underline underline-offset-2 hover:text-coral-700", className)} {...props} />;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("text-coral-600 underline underline-offset-2 hover:text-coral-700", className)}
        {...props}
      />
    );
  },
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <span className="block my-6 rounded-xl overflow-hidden">
      <Image
        src={src || ""}
        alt={alt || ""}
        width={800}
        height={450}
        className="w-full h-auto rounded-xl"
        {...(props as Record<string, unknown>)}
      />
    </span>
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className={cn(
        "border-l-4 border-sunny-400 pl-4 py-1 my-4 italic text-ink-600 bg-sunny-50 rounded-r-lg",
        className
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className={cn("list-disc list-outside pl-6 mb-4 space-y-1 text-ink-700", className)} {...props} />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className={cn("list-decimal list-outside pl-6 mb-4 space-y-1 text-ink-700", className)} {...props} />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className={cn("leading-7", className)} {...props} />
  ),
  hr: () => <hr className="my-8 border-cream-300" />,
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-6">
      <table className={cn("w-full text-sm border-collapse", className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className={cn("border border-cream-300 px-3 py-2 bg-cream-100 font-semibold text-ink-800 text-left", className)} {...props} />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className={cn("border border-cream-200 px-3 py-2 text-ink-700", className)} {...props} />
  ),
  Callout,
};
