const CLOUD_SUFFIX = ".convex.cloud";
const SITE_SUFFIX = ".convex.site";
const TRAILING_SLASH_PATTERN = /\/$/u;

function convexSiteUrl() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    return "";
  }

  return convexUrl
    .replace(CLOUD_SUFFIX, SITE_SUFFIX)
    .replace(TRAILING_SLASH_PATTERN, "");
}

export function imageDeliveryUrl(resultId: string) {
  const siteUrl = convexSiteUrl();
  return siteUrl ? `${siteUrl}/images/${resultId}` : "";
}
