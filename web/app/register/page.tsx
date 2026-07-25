"use client";

/**
 * Page d'inscription. Miroir de app/login/page.tsx.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import RegisterForm from "@/components/auth/RegisterForm";
import { useAuth } from "@/context/AuthContext";
import type { RegisterCredentials } from "@/types/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { user, isInitializing, isAuthenticating, error, register } = useAuth();

  useEffect(() => {
    if (!isInitializing && user) {
      router.replace("/parcels");
    }
  }, [isInitializing, user, router]);

  async function handleSubmit(credentials: RegisterCredentials) {
    try {
      await register(credentials);
      router.replace("/parcels");
    } catch {
      // L'erreur est déjà exposée via `error` (state du AuthProvider).
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Inscription</h1>
        </div>

        <RegisterForm
          onSubmit={handleSubmit}
          isSubmitting={isAuthenticating}
          error={error}
        />

        <p className="mt-6 text-center text-sm text-slate-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
