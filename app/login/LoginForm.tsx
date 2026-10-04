"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3">
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Mot de passe"
        required
        autoFocus
        className="w-full rounded-xl border border-edge bg-well px-4 py-3 text-base outline-none focus:border-xp"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-xl bg-xp py-3 font-bold text-xp-ink active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "…" : "Entrer dans le jeu"}
      </button>
    </form>
  );
}
