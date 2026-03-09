"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/search/SearchModal";

const navLinks = [
  { href: "/blog", label: "블로그" },
  { href: "/categories", label: "카테고리" },
  { href: "/about", label: "소개" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
          <Link href="/" className="font-heading font-extrabold text-lg text-[#4A3728] hover:text-[#607D8B] transition-colors">
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
              aria-label="검색 열기"
            >
              <Search className="w-5 h-5" />
            </button>
          </nav>

          <div className="sm:hidden flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-md text-[#555555] hover:text-[#333333] hover:bg-[#F8F5EE] transition-colors"
              aria-label="검색 열기"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-md text-[#555555] hover:text-[#333333] hover:bg-[#F8F5EE]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="메뉴 열기"
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
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
