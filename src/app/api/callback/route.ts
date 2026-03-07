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

  function sendMessage() {
    var opener = window.opener;
    if (!opener) {
      document.getElementById("msg").innerText = "Auth popup lost connection. Please close this window and try again.";
      return;
    }
    if (token) {
      opener.postMessage(
        "authorization:github:success:" + JSON.stringify({token: token, provider: "github"}),
        "*"
      );
    } else {
      opener.postMessage(
        "authorization:github:error:" + JSON.stringify({error: error}),
        "*"
      );
    }
    setTimeout(function() { window.close(); }, 500);
  }

  sendMessage();
})();
</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
