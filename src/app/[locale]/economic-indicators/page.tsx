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
      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] items-start">
        <aside className="lg:sticky lg:top-24 rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold text-ink-900 mb-3">{isKo ? "지표 메뉴" : "Indicators"}</h2>
          <nav className="space-y-1">
            {["물가", "금리", "경제성장률", "실업률", "심리"].map((item) => (
              <a key={item} href={`#${item}`} className="block rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-cream-50 hover:text-sunny-700">{item}</a>
            ))}
          </nav>
        </aside>
        <article className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-8 shadow-sm">
          <h2 className="font-serif font-bold text-2xl text-ink-900 mb-2">{isKo ? "최근 5년 주요 경제지표" : "Key Economic Indicators: Latest Five Years"}</h2>
          <p className="text-ink-500 mb-6">{isKo ? "한국·미국·일본·중국의 물가, 금리, 성장률, 실업률, 심리를 한눈에 비교합니다." : "Compare inflation, rates, growth, unemployment, and sentiment across Korea, the US, Japan, and China."}</p>
          <span id="물가" className="block -mt-20 pt-20" />
          <span id="금리" className="block" />
          <span id="경제성장률" className="block" />
          <span id="실업률" className="block" />
          <span id="심리" className="block" />
          <img
            src="/images/posts/economic-indicators-2026-10-31/01-all-indicators-5y-with-sentiment.png"
            alt={isKo ? "최근 5년 4개국 경제지표 인포그래픽" : "Five-year economic indicators infographic for four countries"}
            className="w-full rounded-xl border border-cream-200"
          />
        </article>
      </div>
    </Container>
  );
}
