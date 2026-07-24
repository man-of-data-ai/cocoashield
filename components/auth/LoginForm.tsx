"use client";

/**
 * Composant de présentation pur : il ne connaît pas la mécanique d'appel
 * réseau, seulement une fonction `onSubmit` à invoquer avec les identifiants
 * saisis. Toute la logique d'authentification vit dans useAuth / authService.
 */

import { useState, type FormEvent } from "react";

import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import type { LoginCredentials } from "@/types/auth";

type LoginFormProps = {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export default function LoginForm({
  onSubmit,
  isSubmitting,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="vous@cadastre.fr"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="••••••••"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? <Spinner label="Connexion..." /> : "Se connecter"}
      </button>
    </form>
  );
}
