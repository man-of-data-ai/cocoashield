"use client";

import { useState, type FormEvent } from "react";

import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import type { RegisterCredentials } from "@/types/auth";

type RegisterFormProps = {
  onSubmit: (credentials: RegisterCredentials) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export default function RegisterForm({
  onSubmit,
  isSubmitting,
  error,
}: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit({ email, username, password, confirmPassword });
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
          className="mt-1 w-full rounded-2xl border border-[#DCE6D7] bg-[#FBFCFA] px-4 py-3 text-slate-900 outline-none transition focus:border-[#87B940] focus:bg-white focus:ring-2 focus:ring-[#87B940]/15"
          placeholder="vous@cocoashield.ci"
        />
      </div>

      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-slate-700"
        >
          Nom d&rsquo;utilisateur
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-1 w-full rounded-2xl border border-[#DCE6D7] bg-[#FBFCFA] px-4 py-3 text-slate-900 outline-none transition focus:border-[#87B940] focus:bg-white focus:ring-2 focus:ring-[#87B940]/15"
          placeholder="jean.dupont"
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-2xl border border-[#DCE6D7] bg-[#FBFCFA] px-4 py-3 text-slate-900 outline-none transition focus:border-[#87B940] focus:bg-white focus:ring-2 focus:ring-[#87B940]/15"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-slate-700"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-1 w-full rounded-2xl border border-[#DCE6D7] bg-[#FBFCFA] px-4 py-3 text-slate-900 outline-none transition focus:border-[#87B940] focus:bg-white focus:ring-2 focus:ring-[#87B940]/15"
          placeholder="••••••••"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244B32] px-4 py-3 font-semibold text-white transition hover:bg-[#356A46] hover:shadow-[0_10px_24px_rgba(36,75,50,0.14)] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? (
          <Spinner label="Création du compte..." />
        ) : (
          "S'inscrire"
        )}
      </button>
    </form>
  );
}
