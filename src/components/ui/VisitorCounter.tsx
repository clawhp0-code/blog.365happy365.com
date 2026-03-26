"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, increment } from "firebase/firestore";

interface VisitorData {
  total: number;
  today: number;
  yesterday: number;
}

function getDateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().split("T")[0];
}

export function VisitorCounter() {
  const [data, setData] = useState<VisitorData | null>(null);

  useEffect(() => {
    const today = getDateKey(0);
    const yesterday = getDateKey(1);
    const ref = doc(db, "visitors", "counters");

    setDoc(ref, { total: increment(1), [today]: increment(1) }, { merge: true })
      .then(() => getDoc(ref))
      .then((snap) => {
        const d = snap.data() || {};
        setData({
          total: d.total ?? 0,
          today: d[today] ?? 0,
          yesterday: d[yesterday] ?? 0,
        });
      })
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
