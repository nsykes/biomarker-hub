import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";

const neonMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export default async function middleware(request: NextRequest) {
  // Server actions authenticate via requireUser() — skip middleware auth
  // to prevent redirects from breaking the RPC response format
  if (request.headers.get("next-action")) {
    return NextResponse.next();
  }
  return neonMiddleware(request);
}

export const config = {
  matcher: ["/", "/biomarkers/:path*", "/api/extract", "/api/reports/:path*"],
};
