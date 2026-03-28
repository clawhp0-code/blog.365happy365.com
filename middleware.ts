import { NextRequest, NextResponse } from "next/server";

const locales = ["ko", "en"];
const defaultLocale = "ko";

function getLocaleFromHeaders(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") || "";
  const languages = acceptLanguage.split(",").map((l) => l.split(";")[0].trim().toLowerCase());
  for (const lang of languages) {
    const prefix = lang.substring(0, 2);
    if (locales.includes(prefix)) {
      return prefix;
    }
  }
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public files, api routes, admin, _next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check if the pathname already starts with a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Rewrite to default locale (keep original URL visible)
  const locale = getLocaleFromHeaders(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/", "/((?!_next|api|admin|favicon\\.ico|.*\\..*).*)" ],
};
