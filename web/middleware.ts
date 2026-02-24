import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/", "/biomarkers/:path*", "/api/extract", "/api/reports/:path*"],
};
