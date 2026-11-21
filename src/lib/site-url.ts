const defaultSiteUrl = "https://blog.365happy365.com";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || defaultSiteUrl;
