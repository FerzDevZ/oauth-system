import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserBySessionToken } from "@/lib/db";

// Proteksi route global (pengganti middleware di Next 16).
// Proxy berjalan di runtime nodejs, jadi bisa query SQLite.
// Optimistic check: token session divalidasi langsung ke database.

const PROTECTED_PREFIXES = ["/dashboard"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_session")?.value;
  const user = token ? getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL("/?error=unauthorized", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Jalankan di semua route, kecuali API, aset statis, dan file publik
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)$).*)",
  ],
};
