"use client";

/**
 * Page de connexion. Redirige automatiquement vers /map si une session est
 * déjà active, et vers la page demandée (?from=) après connexion réussie.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";
import type { LoginCredentials } from "@/types/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitializing, isAuthenticating, error, login } = useAuth();

  useEffect(() => {
    if (!isInitializing && user) {
      router.replace(searchParams.get("from") ?? "/map");
    }
  }, [isInitializing, user, router, searchParams]);

  async function handleSubmit(credentials: LoginCredentials) {
    try {
      await login(credentials);
      router.replace(searchParams.get("from") ?? "/map");
    } catch {
      // L'erreur est déjà exposée via `error` (state du AuthProvider).
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
        </div>

        <LoginForm
          onSubmit={handleSubmit}
          isSubmitting={isAuthenticating}
          error={error}
        />
      </div>
    </main>
  );
}
