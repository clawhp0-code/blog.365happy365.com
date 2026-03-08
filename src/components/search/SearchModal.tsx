"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import Fuse from "fuse.js";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import type { Post } from "contentlayer2/generated";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Post[]>([]);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fuseRef = useRef<Fuse<Post> | null>(null);

  // Initialize fuse on mount
  useEffect(() => {
    setMounted(true);
    const posts = getAllPosts();
    fuseRef.current = new Fuse(posts, {
      keys: [
        { name: "title", weight: 0.4 },
        { name: "description", weight: 0.3 },
        { name: "tags", weight: 0.2 },
        { name: "category", weight: 0.1 },
      ],
      threshold: 0.3,
    });
  }, []);

  // Update results when query changes
  useEffect(() => {
    if (!mounted || !fuseRef.current) return;

    if (query.trim() === "") {
      // Show recent posts when search is empty
      const posts = getAllPosts();
      setResults(posts.slice(0, 5));
    } else {
      const searchResults = fuseRef.current.search(query);
      setResults(searchResults.map((result) => result.item));
    }
  }, [query, mounted]);

  // Handle keyboard events
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === "Escape") {
        onClose();
      }
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          // Open is handled by Navbar, just focus input when it opens
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, mounted]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-lg mx-4 mt-[20vh] bg-white rounded-2xl shadow-2xl border border-[#E8E2D9] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E2D9]">
              <Search className="w-5 h-5 text-[#999999] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="검색어를 입력하세요..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-base outline-none bg-transparent placeholder:text-[#CCCCCC]"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-[#999999] hover:text-[#555555]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline text-xs text-[#999999] border border-[#E8E2D9] rounded px-1.5 py-0.5 bg-[#F8F5EE]">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto py-2">
              {results.length === 0 ? (
                <div className="text-sm text-[#999999] text-center py-8">
                  {query ? "검색 결과가 없습니다" : "최근 포스트"}
                </div>
              ) : (
                <ul className="space-y-0">
                  {results.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        onClick={onClose}
                        className="block px-4 py-3 hover:bg-[#F8F5EE] rounded-lg mx-2 transition-colors"
                      >
                        <div className="text-sm font-medium text-[#333333]">
                          {post.title}
                        </div>
                        <div className="text-xs text-[#999999] mt-0.5 line-clamp-1">
                          {post.description}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs bg-[#FEF3C7] text-[#92400E] rounded-full px-2 py-0.5">
                            {post.category}
                          </span>
                          {post.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-[#E0E7FF] text-[#3730A3] rounded-full px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
