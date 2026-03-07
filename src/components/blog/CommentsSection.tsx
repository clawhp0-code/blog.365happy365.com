"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check } from "lucide-react";

interface Comment {
  id: string;
  name: string;
  content: string;
  createdAt: Timestamp;
}

interface CommentsSectionProps {
  slug: string;
}

export function CommentsSection({ slug }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to Firestore comments
  useEffect(() => {
    if (!mounted) return;

    const commentsRef = collection(db, "comments", slug, "posts");
    const q = query(commentsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Comment[] = [];
      snapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          name: doc.data().name,
          content: doc.data().content,
          createdAt: doc.data().createdAt,
        });
      });
      setComments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [slug, mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !content.trim()) {
      alert("이름과 내용을 입력해주세요.");
      return;
    }

    if (content.length > 1000) {
      alert("내용은 1000자 이하여야 합니다.");
      return;
    }

    setSubmitting(true);

    try {
      const commentsRef = collection(db, "comments", slug, "posts");
      await addDoc(commentsRef, {
        name: name.trim(),
        content: content.trim(),
        createdAt: serverTimestamp(),
      });

      setName("");
      setContent("");
      setSubmitted(true);

      // Show toast notification
      setTimeout(() => setSubmitted(false), 2000);
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      alert("댓글 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <section className="mt-12 pt-8 border-t border-cream-200">
      {/* Header */}
      <h2 className="font-serif text-2xl font-bold text-ink-900 mb-6">
        댓글 {comments.length}개
      </h2>

      {/* Comments List */}
      {loading ? (
        // Skeleton loading
        <div className="space-y-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5 border border-cream-200 animate-pulse"
            >
              <div className="h-4 bg-cream-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-cream-200 rounded w-32 mb-3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-cream-200 rounded"></div>
                <div className="h-3 bg-cream-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-ink-400 text-sm text-center py-8">
          첫 번째 댓글을 남겨보세요 💬
        </p>
      ) : (
        <div className="space-y-3 mb-8">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white rounded-xl p-5 border border-cream-200"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink-800 text-sm">
                  {comment.name}
                </span>
                <span className="text-ink-400 text-xs">
                  {comment.createdAt?.toDate
                    ? new Date(
                        comment.createdAt.toDate()
                      ).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "방금 전"}
                </span>
              </div>
              <p className="text-ink-600 text-sm mt-2 leading-relaxed whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mt-6 bg-cream-50 rounded-xl p-5 border border-cream-200">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-ink-700 mb-2">
            이름
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-lg border border-cream-300 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-sunny-400 disabled:opacity-50"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="content" className="block text-sm font-medium text-ink-700 mb-2">
            댓글
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 입력하세요 (1000자 이하)"
            disabled={submitting}
            maxLength={1000}
            className="w-full px-4 py-3 rounded-lg border border-cream-300 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-sunny-400 disabled:opacity-50 h-24 resize-none"
          />
          <p className="text-xs text-ink-400 mt-1 text-right">
            {content.length}/1000
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-sunny-500 hover:bg-sunny-600 text-white rounded-full px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting ? "등록 중..." : "댓글 등록"}
        </button>
      </form>

      {/* Toast notification */}
      {submitted && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-sunny-500 text-white rounded-full px-6 py-3 flex items-center gap-2 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">댓글이 등록되었습니다! 🎉</span>
        </div>
      )}
    </section>
  );
}
