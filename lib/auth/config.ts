import { isHostedMode } from "./mode";

export function configuredAuthOrigin(): string | null {
  try {
    const url = new URL(process.env.AUTH_URL ?? "");
    if (url.username || url.password || (url.pathname !== "/" && url.pathname !== "/api/auth") || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && !isHostedMode() && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isAllowedAdminId(id: unknown): id is string {
  const allowed = process.env.TIL_ADMIN_GITHUB_ID?.trim();
  return typeof id === "string" && Boolean(allowed && /^[1-9]\d*$/.test(allowed) && id === allowed);
}

export function authConfigurationReady(): boolean {
  return Boolean(process.env.AUTH_GITHUB_ID?.trim() && process.env.AUTH_GITHUB_SECRET?.trim() &&
    (process.env.AUTH_SECRET?.trim().length ?? 0) >= 32 && configuredAuthOrigin() &&
    isAllowedAdminId(process.env.TIL_ADMIN_GITHUB_ID?.trim()));
}

export function safeAdminReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.startsWith("//")) return "/studio";
  try {
    const origin = configuredAuthOrigin() ?? "https://local.invalid";
    const url = new URL(value, origin);
    if (url.origin !== origin || !(url.pathname === "/studio" || url.pathname.startsWith("/studio/"))) return "/studio";
    return url.pathname + url.search;
  } catch {
    return "/studio";
  }
}
