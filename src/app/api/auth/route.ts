import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") || "repo,user";

  const params = new URLSearchParams({
    client_id: (process.env.GITHUB_OAUTH_CLIENT_ID || "").trim(),
    scope,
    redirect_uri: `${(process.env.NEXT_PUBLIC_SITE_URL || "").trim()}/api/callback`,
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
}
