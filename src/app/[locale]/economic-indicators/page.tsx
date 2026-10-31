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
      <div className="rounded-2xl border border-cream-200 bg-white p-8 text-ink-500">
        {isKo ? "경제지표 인포그래픽을 준비하고 있습니다." : "Economic indicator infographics are coming soon."}
      </div>
    </Container>
  );
}
