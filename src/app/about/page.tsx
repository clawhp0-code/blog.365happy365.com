import { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { Sun, BookOpen, Lightbulb, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "소개",
  description: "365happy365 블로그 소개 페이지",
};

export default function AboutPage() {
  return (
    <Container size="sm" className="py-16">
      <AnimatedSection>
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sunny-100 rounded-full mb-4">
            <Sun className="w-8 h-8 text-sunny-500" />
          </div>
          <h1 className="font-serif font-bold text-4xl text-ink-900 mb-4">소개</h1>
          <p className="text-xl text-ink-500">안녕하세요, 365happy365입니다.</p>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.1} className="prose prose-warm max-w-none font-serif">
        <div className="bg-white rounded-2xl p-8 border border-cream-200 mb-8">
          <h2 className="font-serif font-bold text-2xl text-ink-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sunny-500" />
            이 블로그에 대해
          </h2>
          <p className="text-ink-600 leading-relaxed mb-4">
            <strong>365happy365</strong>는 세상의 모든 궁금한 것들을 탐구하는 공간입니다.
            과학, 기술, 문화, 역사, 일상 속에서 발견하는 작은 호기심부터
            큰 의문까지 함께 풀어나갑니다.
          </p>
          <p className="text-ink-600 leading-relaxed">
            매일 하나씩 새로운 것을 배우고, 그 과정에서 세상을 조금 더 넓게 바라보는
            것이 이 블로그의 목표입니다.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-cream-200 mb-8">
          <h2 className="font-serif font-bold text-2xl text-ink-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-coral-500" />
            다루는 주제들
          </h2>
          <ul className="space-y-2 text-ink-600">
            <li>🔬 <strong>과학</strong> - 자연의 신비와 최신 연구</li>
            <li>💻 <strong>기술</strong> - IT, AI, 개발 이야기</li>
            <li>🌍 <strong>문화</strong> - 다양한 문화와 역사</li>
            <li>🧠 <strong>심리학</strong> - 마음과 행동의 과학</li>
            <li>📖 <strong>일상</strong> - 생활 속 흥미로운 발견</li>
          </ul>
        </div>

        <div className="bg-sunny-50 rounded-2xl p-8 border border-sunny-200 text-center">
          <Heart className="w-8 h-8 text-coral-500 mx-auto mb-3" />
          <p className="text-ink-700 font-medium mb-4">
            궁금한 주제나 함께 나누고 싶은 이야기가 있다면 언제든 연락주세요!
          </p>
          <Button href="/blog" variant="primary">
            블로그 읽기 시작하기
          </Button>
        </div>
      </AnimatedSection>
    </Container>
  );
}
