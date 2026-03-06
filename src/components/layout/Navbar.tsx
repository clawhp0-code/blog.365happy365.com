"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/blog", label: "블로그" },
  { href: "/categories", label: "카테고리" },
  { href: "/about", label: "소개" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream-50/90 backdrop-blur-sm border-b border-cream-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-serif font-bold text-xl text-ink-900 hover:text-sunny-600 transition-colors">
            <Sun className="w-6 h-6 text-sunny-500" />
            365happy365
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-sunny-600",
                  pathname.startsWith(link.href)
                    ? "text-sunny-600 font-semibold"
                    : "text-ink-600"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            className="sm:hidden p-2 rounded-md text-ink-600 hover:text-ink-900 hover:bg-cream-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="메뉴 열기"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="sm:hidden py-3 border-t border-cream-200">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block py-2 text-sm font-medium transition-colors hover:text-sunny-600",
                  pathname.startsWith(link.href)
                    ? "text-sunny-600 font-semibold"
                    : "text-ink-600"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
