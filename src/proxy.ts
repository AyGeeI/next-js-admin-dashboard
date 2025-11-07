import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !req.auth) {
    const url = new URL("/auth/v1/login", req.url);
    const search = searchParams.toString();
    url.searchParams.set("from", pathname + (search ? `?${search}` : ""));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
