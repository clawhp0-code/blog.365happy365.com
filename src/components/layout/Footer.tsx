import Link from "next/link";
import { Rss } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E8E2D9] mt-16">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-heading font-bold text-base text-[#4A3728]">
            365 Happy 365
          </span>
          <p className="text-sm text-[#888888] text-center">
            세상의 모든 궁금한 것들을 탐구합니다
          </p>
          <Link
            href="/feed.xml"
            className="text-[#AAAAAA] hover:text-[#607D8B] transition-colors"
            aria-label="RSS 피드"
          >
            <Rss className="w-5 h-5" />
          </Link>
        </div>
        <div className="mt-6 pt-4 border-t border-[#E8E2D9] text-center text-xs text-[#AAAAAA]">
          &copy; {currentYear} 365 Happy 365. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
