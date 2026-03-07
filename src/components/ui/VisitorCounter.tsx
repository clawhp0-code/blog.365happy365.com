"use client";

import { useEffect, useState } from "react";

interface VisitorData {
  total: number;
  today: number;
  yesterday: number;
}

export function VisitorCounter() {
  const [data, setData] = useState<VisitorData | null>(null);

  useEffect(() => {
    fetch("/api/visitors")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 text-center">
      <p className="text-xs text-[#999999] mb-1">Total</p>
      <p className="font-heading font-extrabold text-3xl text-[#333333] mb-3">
        {data.total.toLocaleString()}
      </p>
      <div className="flex justify-between text-sm border-t border-[#E8E2D9] pt-3">
        <span className="text-[#888888]">Today</span>
        <span className="font-medium text-[#333333]">{data.today.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <span className="text-[#888888]">Yesterday</span>
        <span className="font-medium text-[#333333]">{data.yesterday.toLocaleString()}</span>
      </div>
    </div>
  );
}
