"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sunny-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-coral-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className="text-sunny-600 font-semibold text-sm uppercase tracking-widest mb-4">
            365happy365 블로그
          </p>
          <h1 className="font-serif font-bold text-4xl md:text-6xl text-ink-900 mb-6 leading-tight">
            세상의 모든
            <span className="text-sunny-500"> 궁금한 </span>
            것들
          </h1>
          <p className="text-lg md:text-xl text-ink-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            과학, 기술, 문화, 일상 속 작은 호기심에서 시작해<br className="hidden md:block" />
            세상을 더 넓게 바라보는 이야기를 나눕니다.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button href="/blog" size="lg">
            블로그 읽기
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button href="/categories" variant="outline" size="lg">
            카테고리 탐색
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
