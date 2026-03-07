"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Share2, MoreHorizontal, Copy } from "lucide-react";

interface PostActionsProps {
  slug: string;
  title: string;
  url: string;
}

interface LikeData {
  liked: boolean;
  count: number;
}

export function PostActions({ slug, title, url }: PostActionsProps) {
  const [mounted, setMounted] = useState(false);
  const [likeData, setLikeData] = useState<LikeData>({ liked: false, count: 0 });
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Load like data from localStorage on mount
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

  // Close popovers on outside click
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

  // Auto-hide toast after 2 seconds
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
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      title
    )}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
    setShareOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setToast("링크가 복사되었습니다! 📋");
      setShareOpen(false);
    } catch {
      setToast("복사 실패. 다시 시도해주세요.");
    }
  };

  const handleBookmark = () => {
    setToast("스크랩 기능은 곧 추가됩니다 📌");
    setMoreOpen(false);
  };

  const handleReport = () => {
    setToast("신고가 접수되었습니다 ✓");
    setMoreOpen(false);
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-center gap-3 py-8">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
            likeData.liked
              ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
              : "border-cream-300 bg-white text-ink-600 hover:bg-cream-100 hover:border-cream-400"
          }`}
        >
          <Heart
            className={`w-5 h-5 ${likeData.liked ? "fill-red-500" : ""}`}
          />
          {likeData.count > 0 && <span className="text-xs font-semibold">{likeData.count}</span>}
        </button>

        {/* Share Button */}
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
                <span>𝕏</span> 트위터
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-100 flex items-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" /> 링크 복사
              </button>
            </div>
          )}
        </div>

        {/* More Button */}
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
                <span>🔖</span> 스크랩
              </button>
              <button
                onClick={handleReport}
                className="w-full px-4 py-2.5 text-sm text-ink-600 hover:bg-cream-100 flex items-center gap-2 transition-colors"
              >
                <span>⚠️</span> 신고하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink-800 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toast}
        </div>
      )}
    </>
  );
}
