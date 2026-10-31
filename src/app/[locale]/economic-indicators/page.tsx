import { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import type { Locale } from "@/lib/i18n";

interface PageProps { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "ko" ? "경제지표" : "Economic Indicators", description: locale === "ko" ? "주요 경제지표 인포그래픽" : "Economic indicator infographics" };
}

export default async function EconomicIndicatorsPage({ params }: PageProps) {
  const { locale } = await params;
  const isKo = (locale as Locale) === "ko";
  return (
    <Container className="py-12">
      <h1 className="font-serif font-bold text-4xl text-ink-900 mb-3">{isKo ? "경제지표" : "Economic Indicators"}</h1>
      <p className="text-ink-500 mb-10">{isKo ? "금리·물가·환율·주가지수 등 주요 경제 흐름을 한눈에 확인하세요." : "Explore key trends in rates, inflation, currencies, and stock indexes."}</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 justify-end md:max-w-[900px] md:ml-auto">
        {(isKo ? [
          ["물가", "생활비와 가격 흐름"],
          ["금리", "대출·예금과 자금 비용"],
          ["경제성장률", "경제가 커지는 속도"],
          ["실업률", "일자리 시장의 온도"],
          ["심리", "소비자와 기업의 기대"],
        ] : [
          ["Inflation", "Prices and living costs"],
          ["Rates", "Borrowing and saving costs"],
          ["Growth", "The pace of expansion"],
          ["Unemployment", "The labor market"],
          ["Sentiment", "Consumer and business expectations"],
        ]).map(([title, description]) => (
          <div key={title} id={title} className="rounded-xl border border-cream-200 bg-white p-4 scroll-mt-24">
            <h2 className="font-semibold text-ink-900">{title}</h2>
            <p className="mt-1 text-xs text-ink-500">{description}</p>
          </div>
        ))}
      </div>
      <article className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-8 shadow-sm">
        <h2 className="font-serif font-bold text-2xl text-ink-900 mb-2">{isKo ? "최근 5년 주요 경제지표" : "Key Economic Indicators: Latest Five Years"}</h2>
        <p className="text-ink-500 mb-6">{isKo ? "한국·미국·일본·중국의 물가, 금리, 성장률, 실업률, 심리를 한눈에 비교합니다." : "Compare inflation, rates, growth, unemployment, and sentiment across Korea, the US, Japan, and China."}</p>
        <img
          src="/images/posts/economic-indicators-2026-10-31/01-all-indicators-5y-with-sentiment.png"
          alt={isKo ? "최근 5년 4개국 경제지표 인포그래픽" : "Five-year economic indicators infographic for four countries"}
          className="w-full rounded-xl border border-cream-200"
        />
      </article>
    </Container>
  );
}
