import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const symbols = [
  { symbol: "^KS11", name: "KOSPI" },
  { symbol: "^GSPC", name: "S&P 500" },
];

async function quote(symbol: string, name: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`quote ${response.status}`);
  const payload = await response.json();
  const meta = payload?.chart?.result?.[0]?.meta;
  const value = Number(meta?.regularMarketPrice ?? meta?.previousClose);
  const previous = Number(meta?.previousClose);
  if (!Number.isFinite(value) || !Number.isFinite(previous)) throw new Error("invalid quote");
  const change = value - previous;
  return { name, value, change, percent: previous ? (change / previous) * 100 : 0 };
}

export async function GET() {
  try {
    const quotes = [];
    for (const item of symbols) quotes.push(await quote(item.symbol, item.name));
    return NextResponse.json(quotes, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "시세를 잠시 불러오지 못했습니다." }, { status: 503 });
  }
}
