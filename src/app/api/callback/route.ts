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
      client_id: (process.env.GITHUB_OAUTH_CLIENT_ID || "").trim(),
      client_secret: (process.env.GITHUB_OAUTH_CLIENT_SECRET || "").trim(),
      code,
    }),
  });

  const data = await tokenRes.json();

  const message = data.error
    ? JSON.stringify({
        provider: "github",
        status: "error",
        error: data.error_description || data.error,
      })
    : JSON.stringify({
        provider: "github",
        status: "success",
        token: data.access_token,
      });

  const html = `<!doctype html><html><body><script>
(function() {
  var msg = ${message};
  var status = msg.status;
  delete msg.status;
  window.opener.postMessage(
    "authorization:github:" + status + ":" + JSON.stringify(msg),
    "*"
  );
  window.close();
})();
</script></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
