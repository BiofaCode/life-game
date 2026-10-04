"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/auth";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  if (!(await passwordMatches(password))) {
    await new Promise((r) => setTimeout(r, 800)); // freine le brute-force
    return "Mot de passe incorrect.";
  }
  (await cookies()).set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}
