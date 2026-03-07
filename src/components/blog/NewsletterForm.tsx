"use client";

import { useState } from "react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

type FormStatus = "idle" | "loading" | "success" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setStatus("loading");

    // Simulate API call delay
    setTimeout(() => {
      setStatus("success");
      setEmail("");

      // Reset success message after 5 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 5000);
    }, 800);
  };

  return (
    <AnimatedSection className="mt-12 pt-8 border-t border-cream-200">
      <div className="bg-sunny-50 border border-sunny-200 rounded-2xl p-8">
        <div className="max-w-md">
          <h3 className="font-serif text-2xl font-bold text-ink-900 mb-2">
            새 글을 이메일로 받아보세요 ✉️
          </h3>
          <p className="text-ink-500 mb-6">
            새 글이 올라오면 바로 알려드릴게요
          </p>

          {status === "success" ? (
            <div className="text-sunny-700 font-medium">
              구독해 주셔서 감사해요! 🎉
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력해 주세요"
                required
                className="px-4 py-2.5 rounded-lg border border-sunny-200 bg-white text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-sunny-400 focus:border-transparent transition-all"
                disabled={status === "loading"}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 bg-sunny-500 text-white hover:bg-sunny-600 shadow-sm hover:shadow text-sm px-6 py-2.5 w-full disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "구독 중..." : "구독하기"}
              </button>
            </form>
          )}
        </div>
      </div>
    </AnimatedSection>
  );
}
