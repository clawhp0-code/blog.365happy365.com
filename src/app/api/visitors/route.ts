import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

function getRedis() {
  const url = process.env.KV_REDIS_URL || "";
  // Parse rediss://default:TOKEN@HOST:PORT
  const match = url.match(/rediss?:\/\/[^:]+:([^@]+)@([^:]+)/);
  if (!match) throw new Error("Invalid KV_REDIS_URL");
  const [, token, host] = match;
  return new Redis({
    url: `https://${host}`,
    token,
  });
}

function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

export async function GET() {
  try {
    const redis = getRedis();
    const today = getDateKey(new Date());
    const yesterday = getDateKey(getYesterday());

    const [total, todayCount] = await Promise.all([
      redis.incr("visitors:total"),
      redis.incr(`visitors:${today}`),
    ]);

    await redis.expire(`visitors:${today}`, 60 * 60 * 48);

    const yesterdayCount = (await redis.get<number>(`visitors:${yesterday}`)) || 0;

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
