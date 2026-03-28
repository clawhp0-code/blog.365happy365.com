"use client";

import { motion } from "framer-motion";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

interface HeroSectionProps {
  locale: Locale;
}

export function HeroSection({ locale }: HeroSectionProps) {
  const dict = getDictionary(locale);

  return (
    <section className="bg-white border-b border-[#E8E2D9] py-12 md:py-16">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="font-heading font-extrabold text-3xl md:text-4xl text-[#4A3728] mb-3">
            blog.365happy365.com
          </h1>
          <p className="text-base md:text-lg text-[#888888]">
            {dict.site.tagline}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
