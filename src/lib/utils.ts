import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import type { Locale } from "@/lib/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, locale: Locale = "ko"): string {
  if (locale === "en") {
    return format(parseISO(dateString), "MMM d, yyyy", { locale: enUS });
  }
  return format(parseISO(dateString), "yyyy년 M월 d일", { locale: ko });
}

export function formatDateShort(dateString: string): string {
  return format(parseISO(dateString), "yyyy.MM.dd");
}

export function readingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
