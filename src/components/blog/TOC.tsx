"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TOCProps {
  headings: TocItem[];
}

export function TOC({ headings }: TOCProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -80% 0px" }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="hidden xl:block sticky top-24 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
        목차
      </p>
      <ul className="space-y-1">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={cn(
                "block text-sm py-0.5 transition-colors hover:text-sunny-600 border-l-2 pl-3",
                level === 3 && "pl-6",
                level === 4 && "pl-9",
                activeId === id
                  ? "border-sunny-500 text-sunny-700 font-medium"
                  : "border-transparent text-ink-500"
              )}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
