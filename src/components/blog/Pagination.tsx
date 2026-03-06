import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  return (
    <nav className="flex items-center justify-center gap-2 mt-12">
      {currentPage > 1 && (
        <Link
          href={`${basePath}?page=${currentPage - 1}`}
          className="p-2 rounded-full hover:bg-cream-100 text-ink-500 transition-colors"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      )}

      {visiblePages.map((page, idx) => {
        const prev = visiblePages[idx - 1];
        const showEllipsis = prev && page - prev > 1;

        return (
          <span key={page} className="flex items-center gap-2">
            {showEllipsis && <span className="text-ink-400 px-1">…</span>}
            <Link
              href={`${basePath}?page=${page}`}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                page === currentPage
                  ? "bg-sunny-500 text-white"
                  : "text-ink-600 hover:bg-cream-100"
              )}
            >
              {page}
            </Link>
          </span>
        );
      })}

      {currentPage < totalPages && (
        <Link
          href={`${basePath}?page=${currentPage + 1}`}
          className="p-2 rounded-full hover:bg-cream-100 text-ink-500 transition-colors"
          aria-label="다음 페이지"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      )}
    </nav>
  );
}
