import { NextResponse, type NextFetchEvent, type NextRequest, type NextMiddleware } from "next/server";
import { auth } from "@/auth";
import { authConfigurationReady, isAllowedAdminId } from "@/lib/auth/config";
import { isHostedMode } from "@/lib/auth/mode";

function loginRedirect(request: NextRequest) {
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

const protectStudio: Parameters<typeof auth>[0] = (request) => {
  // Auth.js invokes custom middleware even when its authorized callback is false.
  return isAllowedAdminId(request.auth?.user?.id) ? NextResponse.next() : loginRedirect(request);
};
const authenticatedProxy: NextMiddleware = auth(protectStudio);

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isHostedMode()) return NextResponse.next();
  if (!authConfigurationReady()) {
    return loginRedirect(request);
  }
  // Lazy Auth.js configuration resolves the wrapper asynchronously at runtime.
  return (await authenticatedProxy)(request, event);
}

export const config = { matcher: ["/studio/:path*"] };
