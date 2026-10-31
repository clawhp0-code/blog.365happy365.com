"use client";

import { useEffect, useRef } from "react";

/** TradingView ticker tape: live/streaming quotes where the exchange feed permits it. */
export function MarketTicker() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "KRX:KOSPI", title: "KOSPI" },
        { proName: "SP:SPX", title: "S&P 500" },
      ],
      showSymbolLogo: false,
      colorTheme: "light",
      isTransparent: true,
      displayMode: "adaptive",
      locale: "kr",
    });
    host.appendChild(script);
    return () => host.replaceChildren();
  }, []);

  return (
    <div className="market-ticker" aria-label="KOSPI와 S&P 500 실시간 시세">
      <div ref={hostRef} className="tradingview-widget-container" />
    </div>
  );
}
