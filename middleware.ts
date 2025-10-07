import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE = "ed_session";
const AUTH_FREE_PATHS = new Set([
  "/login",
  "/register",
  "/recover"
]);

function isAuthFreePath(pathname: string) {
  if (AUTH_FREE_PATHS.has(pathname)) return true;
  // Libera ativos públicos e arquivos PWA/estáticos
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) return true;
  return false;
}

async function verifyJWT(token: string | undefined) {
  if (!token) return false;
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");
  try {
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Libera rotas de (auth) e arquivos estáticos
  if (isAuthFreePath(pathname)) {
    return NextResponse.next();
  }

  // Protege demais rotas (as páginas do app)
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const ok = await verifyJWT(token);

  if (ok) return NextResponse.next();

  // Redireciona para /login com retorno para a rota original
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = search ? `?next=${encodeURIComponent(pathname + search)}` : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

// Aplica o middleware em todas as rotas, exceto estáticos comuns (tratados acima).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*|robots.txt|sitemap.xml).*)"
  ]
};
