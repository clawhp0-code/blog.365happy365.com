"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Search, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/search/SearchModal";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface NavbarProps {
  locale: Locale;
}

export function Navbar({ locale }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dict = getDictionary(locale);

  const navLinks = [
    { href: `/${locale}/blog`, label: dict.nav.blog },
    { href: `/${locale}/categories`, label: dict.nav.categories },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];

  // Get the alternate locale link (same path, different locale)
  const altLocale = locale === "ko" ? "en" : "ko";
  const altPath = pathname.replace(`/${locale}`, `/${altLocale}`);

  // Handle Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E8E2D9]">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href={`/${locale}`} className="font-heading font-extrabold text-lg text-[#4A3728] hover:text-[#607D8B] transition-colors">
            blog.365happy365.com
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-[#607D8B]",
                  pathname.startsWith(link.href)
                    ? "text-[#607D8B] font-semibold"
                    : "text-[#555555]"
                )}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-md text-[#555555] hover:text-[#333333] hover:bg-[#F8F5EE] transition-colors"
              aria-label={dict.nav.openSearch}
            >
              <Search className="w-5 h-5" />
            </button>
            <Link
              href={altPath}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#555555] hover:text-[#333333] hover:bg-[#F8F5EE] transition-colors border border-[#E8E2D9]"
            >
              <Globe className="w-3.5 h-3.5" />
              {altLocale.toUpperCase()}
            </Link>
          </nav>

          <div className="sm:hidden flex items-center gap-2">
            <Link
              href={altPath}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#555555] hover:text-[#333333] hover:bg-[#F8F5EE] transition-colors border border-[#E8E2D9]"
            >
              <Globe className="w-3.5 h-3.5" />
              {altLocale.toUpperCase()}
            </Link>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-md text-[#555555] hover:text-[#333333] hover:bg-[#F8F5EE] transition-colors"
              aria-label={dict.nav.openSearch}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-md text-[#555555] hover:text-[#333333] hover:bg-[#F8F5EE]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={dict.nav.openMenu}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="sm:hidden py-3 border-t border-[#E8E2D9]">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block py-2 text-sm font-medium transition-colors hover:text-[#607D8B]",
                  pathname.startsWith(link.href)
                    ? "text-[#607D8B] font-semibold"
                    : "text-[#555555]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} locale={locale} />
    </header>
  );
}
