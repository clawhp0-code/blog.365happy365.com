import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

export async function GET() {
  try {
    const today = getDateKey(new Date());
    const yesterday = getDateKey(getYesterday());

    // Increment total and today's count
    const [total, todayCount] = await Promise.all([
      kv.incr("visitors:total"),
      kv.incr(`visitors:${today}`),
    ]);

    // Set expiry for daily keys (48 hours to keep yesterday available)
    await kv.expire(`visitors:${today}`, 60 * 60 * 48);

    // Get yesterday's count
    const yesterdayCount = (await kv.get<number>(`visitors:${yesterday}`)) || 0;

    return NextResponse.json({
      total,
      today: todayCount,
      yesterday: yesterdayCount,
    });
  } catch {
    return NextResponse.json(
      { total: 0, today: 0, yesterday: 0 },
      { status: 500 }
    );
  }
}
