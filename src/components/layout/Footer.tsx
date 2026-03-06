import Link from "next/link";
import { Sun, Rss, Github } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-cream-200 bg-cream-100 mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-serif font-bold text-lg text-ink-800">
            <Sun className="w-5 h-5 text-sunny-500" />
            365happy365
          </div>

          <p className="text-sm text-ink-500 text-center">
            세상의 모든 궁금한 것들을 탐구합니다
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/feed.xml"
              className="text-ink-400 hover:text-sunny-500 transition-colors"
              aria-label="RSS 피드"
            >
              <Rss className="w-5 h-5" />
            </Link>
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-400 hover:text-ink-700 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-cream-200 text-center text-xs text-ink-400">
          © {currentYear} 365happy365. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
