"use client";

import { motion } from "framer-motion";

export function HeroSection() {
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
            세상의 모든 궁금한 것들을 탐구하는 블로그
          </p>
        </motion.div>
      </div>
    </section>
  );
}
