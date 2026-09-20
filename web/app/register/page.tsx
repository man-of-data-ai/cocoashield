"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Leaf, Sprout } from "lucide-react";

import RegisterForm from "@/components/auth/RegisterForm";
import { useAuth } from "@/context/AuthContext";
import type { RegisterCredentials } from "@/types/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { user, isInitializing, isAuthenticating, error, register } = useAuth();

  useEffect(() => {
    if (!isInitializing && user) router.replace("/map");
  }, [isInitializing, user, router]);

  async function handleSubmit(credentials: RegisterCredentials) {
    try {
      await register(credentials);
      router.replace("/map");
    } catch {}
  }

  return (
    <main className="min-h-screen bg-[#F6F8F3] p-3 sm:p-5 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[30px] border border-[#E4EADF] bg-white shadow-[0_24px_80px_rgba(42,70,48,0.08)] sm:min-h-[calc(100vh-40px)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-[460px]">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F2F7EE] p-1.5"><Image src="/logo.png" alt="Cocoashield" width={40} height={40} className="h-full w-full object-contain" /></div>
              <span className="text-lg font-bold text-[#244B32]">Cocoashield</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C9A63]">Nouvel espace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#1E3426]">Créer votre compte</h1>
            <p className="mt-2 mb-8 text-sm leading-6 text-slate-500">Configurez votre accès et commencez à suivre vos plantations.</p>

            <RegisterForm onSubmit={handleSubmit} isSubmitting={isAuthenticating} error={error} />

            <p className="mt-7 text-center text-sm text-slate-500">
              Déjà un compte ?{" "}<Link href="/login" className="font-semibold text-[#356A46] hover:text-[#244B32]">Se connecter</Link>
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-[#EDF4E8] p-12 lg:flex lg:flex-col lg:justify-center xl:p-16">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#87B940]/15" />
          <div className="absolute -bottom-24 -left-12 h-80 w-80 rounded-full bg-[#D9782B]/8 blur-2xl" />
          <Leaf className="absolute bottom-10 right-8 h-72 w-72 rotate-12 text-[#5D8D4A]/8" strokeWidth={0.8} />
          <div className="relative z-10 max-w-lg">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#74A53F] shadow-sm"><Sprout className="h-5 w-5" /></div>
            <h2 className="mt-7 text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#244B32] xl:text-5xl">Une vue claire de la santé de votre plantation</h2>
            <div className="mt-7 flex items-center gap-3"><span className="h-1.5 w-16 rounded-full bg-[#87B940]" /><span className="h-1.5 w-6 rounded-full bg-[#D9782B]/70" /></div>
          </div>
        </section>
      </div>
    </main>
  );
}
