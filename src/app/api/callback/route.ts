import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return new NextResponse("Missing code parameter", { status: 400 });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenRes.json();

  const status = data.error ? "error" : "success";
  const content = data.error
    ? JSON.stringify({ error: data.error_description })
    : JSON.stringify({ provider: "github", token: data.access_token });

  const html = `<!doctype html><html><body><script>
(function() {
  window.opener.postMessage(
    "authorization:github:${status}:${content}",
    window.location.origin
  );
  window.close();
})();
</script></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
