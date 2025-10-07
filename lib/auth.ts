import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
export const AUTH_COOKIE = "__educ_session";
const alg = "HS256";
function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET ausente ou curto.");
  return new TextEncoder().encode(s);
}
export async function createSession(payload: { sub: string; email: string; name: string }) {
  const jwt = await new SignJWT(payload).setProtectedHeader({ alg }).setIssuedAt().setExpirationTime("30d").sign(secret());
  const c = await cookies();
  c.set(AUTH_COOKIE, jwt, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60*60*24*30 });
}
export async function destroySession() {
  const c = await cookies();
  c.set(AUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}
export async function getSession(): Promise<{ sub: string; email: string; name: string } | null> {
  const c = await cookies(); const token = c.get(AUTH_COOKIE)?.value; if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return { sub: String(payload.sub), email: String(payload.email), name: String(payload.name) }; }
  catch { return null; }
}
