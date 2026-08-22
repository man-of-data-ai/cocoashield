"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Leaf, ShieldCheck, Sprout } from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";
import type { LoginCredentials } from "@/types/auth";
import { userService } from "@/services/user-service";
import { defaultPathForRole } from "@/lib/access-control";

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPageContent /></Suspense>;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitializing, isAuthenticating, error, login } = useAuth();

  useEffect(() => {
    if (isInitializing || !user) return;
    const requested = searchParams.get("from");
    if (requested) { router.replace(requested); return; }
    userService.me().then((profile) => router.replace(defaultPathForRole(profile.role))).catch(() => router.replace("/map"));
  }, [isInitializing, user, router, searchParams]);

  async function handleSubmit(credentials: LoginCredentials) {
    try {
      await login(credentials);
      const requested = searchParams.get("from");
      if (requested) { router.replace(requested); return; }
      const profile = await userService.me();
      router.replace(defaultPathForRole(profile.role));
    } catch {}
  }

  return (
    <main className="min-h-screen bg-[#F6F8F3] p-3 sm:p-5 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[30px] border border-[#E4EADF] bg-white shadow-[0_24px_80px_rgba(42,70,48,0.08)] sm:min-h-[calc(100vh-40px)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#244B32] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full border-[58px] border-[#87B940]/15" />
          <div className="absolute -bottom-24 left-12 h-72 w-72 rounded-full bg-[#D9782B]/10 blur-3xl" />
          <div className="absolute bottom-14 right-16 rotate-[-12deg] text-[#A9CF75]/10"><Leaf className="h-64 w-64" strokeWidth={0.8} /></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-sm">
              <Image src="/logo.png" alt="Cocoashield" width={44} height={44} className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-[-0.02em]">Cocoashield</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#BFD995]">Plant health intelligence</div>
            </div>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-[#D9E8C8]">
              <Sprout className="h-3.5 w-3.5" /> Surveillance phytosanitaire
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
              Des plantations plus saines, des décisions plus simples.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/65">
              Centralisez la cartographie, les analyses et le suivi terrain dans une interface pensée pour aller à l’essentiel.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-xs text-white/50">
            <ShieldCheck className="h-4 w-4 text-[#A9CF75]" /> Données sécurisées · Suivi terrain centralisé
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-[430px]">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F2F7EE] p-1.5">
                <Image src="/logo.png" alt="Cocoashield" width={40} height={40} className="h-full w-full object-contain" />
              </div>
              <span className="text-lg font-bold text-[#244B32]">Cocoashield</span>
            </div>

            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C9A63]">Bienvenue</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#1E3426]">Connexion</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Retrouvez vos parcelles, vos alertes et vos dernières analyses.</p>
            </div>

            <LoginForm onSubmit={handleSubmit} isSubmitting={isAuthenticating} error={error} />

            <p className="mt-7 text-center text-sm text-slate-500">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-semibold text-[#356A46] hover:text-[#244B32]">Créer un compte</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
