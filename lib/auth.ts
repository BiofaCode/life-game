/**
 * Protection par mot de passe unique (APP_PASSWORD).
 * Le cookie contient un HMAC dérivé du mot de passe : changer le mot de passe
 * déconnecte tous les appareils. Compatible runtime Edge (proxy) et Node.
 */

export const SESSION_COOKIE = "lg_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

async function hmac(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sessionToken(): Promise<string> {
  return hmac(process.env.APP_PASSWORD ?? "", "life-game-session-v1");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** true si l'auth est désactivée ou si le cookie est valide. */
export async function isAuthorized(cookieValue: string | undefined): Promise<boolean> {
  if (!authEnabled()) return true;
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await sessionToken());
}

export async function passwordMatches(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  // Comparaison de HMAC pour un temps constant indépendant de la longueur.
  return safeEqual(await hmac("cmp", input), await hmac("cmp", expected));
}
