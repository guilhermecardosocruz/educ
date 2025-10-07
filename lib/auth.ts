import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Nome fixo do cookie de sessão httpOnly.
 */
export const authCookieName = () => "ed_session";

/**
 * Obtém a chave secreta a partir do ambiente.
 * Em dev, usa um fallback (troque por uma variável segura em produção).
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

/**
 * Assina um JWT (HS256) com expiração padrão de 7 dias.
 * - payload deve conter `sub` (subject) identificando o usuário.
 */
export async function signToken(
  payload: JWTPayload & { sub: string },
  opts?: { expiresIn?: string | number }
): Promise<string> {
  const key = getSecretKey();
  const exp = opts?.expiresIn ?? "7d";

  // Atenção: o payload inteiro é assinado; evite colocar dados sensíveis em texto puro.
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject(payload.sub)
    .setExpirationTime(exp)
    .sign(key);
}

/**
 * Verifica/decodifica um JWT HS256.
 * Lança erro se inválido/expirado.
 */
export async function verifyToken<T extends JWTPayload = JWTPayload>(
  token: string
): Promise<T> {
  const key = getSecretKey();
  const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
  return payload as T;
}

/*
  Observação sobre cookie httpOnly:
  - Use `authCookieName()` para nomear o cookie "ed_session".
  - Ao definir o cookie (em rotas Next.js), marque:
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7  // 7 dias
  - Exemplo (em um route handler):
      import { cookies } from "next/headers";
      const token = await signToken({ sub: userId });
      cookies().set(authCookieName(), token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
      });
*/
