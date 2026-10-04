import { redirect } from "next/navigation";
import { authEnabled } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (!authEnabled()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <p className="mb-6 text-center text-4xl font-black text-gold">⚔️ Life Game</p>
      <div className="rounded-2xl border border-edge bg-panel p-5">
        <LoginForm />
      </div>
    </main>
  );
}
