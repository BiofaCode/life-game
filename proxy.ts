import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (await isAuthorized(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Tout sauf la page de login, les assets et les fichiers PWA.
  matcher: ["/((?!login|api/cron/|sw\\.js|_next/|icons/|apple-icon|manifest\\.webmanifest|favicon).*)"],
};
