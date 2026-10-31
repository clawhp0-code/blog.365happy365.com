"use client";

import { useEffect, useState } from "react";

type Quote = { name: string; value: number; change: number; percent: number };

/** Lightweight server-proxied ticker so the header never shows a broken widget icon. */
export function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/market-indices", { cache: "no-store" });
        if (response.ok && active) setQuotes(await response.json());
      } catch { /* Keep the last successful quote during a temporary outage. */ }
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <div className="market-ticker" aria-label="KOSPI, S&P 500 및 미국 빅테크 실시간 시세">
      <div className="market-ticker-track">
        {[...quotes, ...quotes].map((quote, index) => (
          <span className="market-ticker-item" key={`${quote.name}-${index}`}>
            <b>{quote.name}</b><strong>{quote.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</strong>
            <em className={quote.change >= 0 ? "up" : "down"}>
              {quote.change >= 0 ? "▲" : "▼"} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.percent).toFixed(2)}%)
            </em>
          </span>
        ))}
      </div>
    </div>
  );
}
