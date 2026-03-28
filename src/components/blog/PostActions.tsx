"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Share2, MoreHorizontal, Copy } from "lucide-react";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface PostActionsProps {
  slug: string;
  title: string;
  url: string;
  locale?: Locale;
}

interface LikeData {
  liked: boolean;
  count: number;
}

export function PostActions({ slug, title, url, locale = "ko" }: PostActionsProps) {
  const [mounted, setMounted] = useState(false);
  const [likeData, setLikeData] = useState<LikeData>({ liked: false, count: 0 });
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const dict = getDictionary(locale);

  useEffect(() => {
    setMounted(true);
    const storageKey = `like_${slug}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setLikeData(JSON.parse(saved));
      } catch {
        setLikeData({ liked: false, count: 0 });
      }
    }
  }, [slug]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (shareOpen || moreOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [shareOpen, moreOpen]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLike = () => {
    const newLikeData = {
      liked: !likeData.liked,
      count: likeData.liked ? likeData.count - 1 : likeData.count + 1,
    };
    setLikeData(newLikeData);
    localStorage.setItem(`like_${slug}`, JSON.stringify(newLikeData));
  };

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
    setShareOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setToast(dict.actions.linkCopied);
      setShareOpen(false);
    } catch {
      setToast(dict.actions.copyFailed);
    }
  };

  const handleBookmark = () => {
    setToast(dict.actions.bookmarkSoon);
    setMoreOpen(false);
  };

  const handleReport = () => {
    setToast(dict.actions.reported);
    setMoreOpen(false);
  };

  if (!mounted) return null;

  return (
    <>
      <div className="flex items-center justify-center gap-3 py-8">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
            likeData.liked
              ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
              : "border-cream-300 bg-white text-ink-600 hover:bg-cream-100 hover:border-cream-400"
          }`}
        >
          <Heart className={`w-5 h-5 ${likeData.liked ? "fill-red-500" : ""}`} />
          {likeData.count > 0 && <span className="text-xs font-semibold">{likeData.count}</span>}
        </button>

        <div className="relative" ref={shareRef}>
          <button
            onClick={() => setShareOpen(!shareOpen)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-cream-300 bg-white text-ink-600 hover:bg-cream-100 hover:border-cream-400 transition-all duration-200"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {shareOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-cream-200 min-w-[160px] py-1 overflow-hidden z-50">
              <button
                onClick={handleShareTwitter}
                className="w-full px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-100 flex items-center gap-2 transition-colors"
              >
                <span>𝕏</span> {dict.actions.twitter}
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-100 flex items-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" /> {dict.actions.copyLink}
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-cream-300 bg-white text-ink-600 hover:bg-cream-100 hover:border-cream-400 transition-all duration-200"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {moreOpen && (
            <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-cream-200 min-w-[160px] py-1 overflow-hidden z-50">
              <button
                onClick={handleBookmark}
                className="w-full px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-100 flex items-center gap-2 transition-colors"
              >
                <span>🔖</span> {dict.actions.bookmark}
              </button>
              <button
                onClick={handleReport}
                className="w-full px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-100 flex items-center gap-2 transition-colors"
              >
                <span>⚠️</span> {dict.actions.report}
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink-800 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toast}
        </div>
      )}
    </>
  );
}
