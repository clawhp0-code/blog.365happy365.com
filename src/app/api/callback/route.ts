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

  const token = data.access_token || "";
  const error = data.error_description || data.error || "";

  const html = `<!doctype html>
<html><head><title>Auth</title></head><body>
<p id="msg">Completing authentication...</p>
<script>
(function() {
  var token = "${token}";
  var error = "${error}";

  function receiveMessage(e) {
    console.log("receiveMessage", e);
    if (!window.opener) return;

    if (token) {
      window.opener.postMessage(
        "authorization:github:success:" + JSON.stringify({token: token, provider: "github"}),
        e.origin
      );
    } else {
      window.opener.postMessage(
        "authorization:github:error:" + JSON.stringify({error: error}),
        e.origin
      );
    }
  }

  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
