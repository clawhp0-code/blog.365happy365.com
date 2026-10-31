import { Metadata } from "next";
import { Container } from "@/components/layout/Container";

const metrics: Record<string, { title: string; description: string; image: string; alt: string }> = {
  inflation: { title: "물가 인포그래픽", description: "최근 5년 한국·미국·일본·중국의 소비자물가 상승률", image: "inflation-5y.png", alt: "최근 5년 4개국 물가상승률 인포그래픽" },
  rates: { title: "금리 인포그래픽", description: "최근 5년 한국·미국·일본·중국의 정책금리 흐름", image: "rates-5y.png", alt: "최근 5년 4개국 금리 인포그래픽" },
  growth: { title: "경제성장률 인포그래픽", description: "최근 5년 한국·미국·일본·중국의 실질 GDP 성장률", image: "01-all-indicators-5y-with-sentiment.png", alt: "4개국 경제성장률 인포그래픽" },
  unemployment: { title: "실업률 인포그래픽", description: "최근 5년 한국·미국·일본·중국의 실업률 흐름", image: "unemployment-5y.png", alt: "최근 5년 4개국 실업률 인포그래픽" },
  sentiment: { title: "심리 인포그래픽", description: "최근 5년 한국·미국·일본·중국의 소비자·경제심리", image: "01-all-indicators-5y-with-sentiment.png", alt: "4개국 심리 지표 인포그래픽" },
};

interface PageProps { params: Promise<{ locale: string; metric: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { metric } = await params;
  return { title: metrics[metric]?.title ?? "경제지표" };
}

export default async function MetricPage({ params }: PageProps) {
  const { metric } = await params;
  const item = metrics[metric] ?? metrics.inflation;
  return (
    <Container className="py-12">
      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] items-start">
        <aside className="lg:sticky lg:top-24 rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold text-ink-900 mb-3">경제지표</h2>
          <nav className="space-y-1">
            {[["물가","inflation"],["금리","rates"],["경제성장률","growth"],["실업률","unemployment"],["심리","sentiment"]].map(([label, slug]) => <a key={slug} href={`../${slug}`} className={`block rounded-lg px-3 py-2 text-sm ${slug === metric ? "bg-cream-50 text-sunny-700 font-semibold" : "text-ink-600 hover:bg-cream-50"}`}>{label}</a>)}
          </nav>
        </aside>
        <article className="rounded-2xl border border-cream-200 bg-white p-5 sm:p-8 shadow-sm">
          <h1 className="font-serif font-bold text-3xl text-ink-900 mb-2">{item.title}</h1>
          <p className="text-ink-500 mb-6">{item.description}</p>
          <img src={`/images/posts/economic-indicators-2026-10-31/${item.image}`} alt={item.alt} className="w-full rounded-xl border border-cream-200" />
        </article>
      </div>
    </Container>
  );
}
