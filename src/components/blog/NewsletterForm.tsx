"use client";

import { useState } from "react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

type FormStatus = "idle" | "loading" | "success" | "error";

interface NewsletterFormProps {
  locale?: Locale;
}

export function NewsletterForm({ locale = "ko" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const dict = getDictionary(locale);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 5000);
    }, 800);
  };

  return (
    <AnimatedSection className="mt-12 pt-8 border-t border-cream-200">
      <div className="bg-sunny-50 border border-sunny-200 rounded-2xl p-8">
        <div className="max-w-md">
          <h3 className="font-serif text-2xl font-bold text-ink-900 mb-2">
            {dict.newsletter.title}
          </h3>
          <p className="text-ink-500 mb-6">{dict.newsletter.description}</p>

          {status === "success" ? (
            <div className="text-sunny-700 font-medium">{dict.newsletter.success}</div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={dict.newsletter.placeholder}
                required
                className="px-4 py-2.5 rounded-lg border border-sunny-200 bg-white text-ink-900 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-sunny-400 focus:border-transparent transition-all"
                disabled={status === "loading"}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 bg-sunny-500 text-white hover:bg-sunny-600 shadow-sm hover:shadow text-sm px-6 py-2.5 w-full disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {status === "loading" ? dict.newsletter.subscribing : dict.newsletter.subscribe}
              </button>
            </form>
          )}
        </div>
      </div>
    </AnimatedSection>
  );
}
