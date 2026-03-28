import Link from "next/link";
import { Rss } from "lucide-react";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const dict = getDictionary(locale);

  return (
    <footer className="border-t border-[#E8E2D9] mt-16">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-heading font-bold text-base text-[#4A3728]">
            365 Happy 365
          </span>
          <p className="text-sm text-[#888888] text-center">
            {dict.footer.tagline}
          </p>
          <Link
            href={`/${locale}/feed.xml`}
            className="text-[#AAAAAA] hover:text-[#607D8B] transition-colors"
            aria-label={dict.footer.rssFeed}
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
