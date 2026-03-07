import Redis from "ioredis";
import { NextResponse } from "next/server";

function getRedis() {
  return new Redis(process.env.KV_REDIS_URL || "", {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 5000,
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
  let redis: Redis | null = null;
  try {
    redis = getRedis();
    const today = getDateKey(new Date());
    const yesterday = getDateKey(getYesterday());

    const [total, todayCount] = await Promise.all([
      redis.incr("visitors:total"),
      redis.incr(`visitors:${today}`),
    ]);

    await redis.expire(`visitors:${today}`, 60 * 60 * 48);

    const yesterdayRaw = await redis.get(`visitors:${yesterday}`);
    const yesterdayCount = yesterdayRaw ? parseInt(yesterdayRaw, 10) : 0;

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
  } finally {
    if (redis) redis.disconnect();
  }
}
