"use client";

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
          className="block text-sm font-semibold text-slate-900"
        >
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-[#DCE6D7] bg-[#FBFCFA] px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#87B940] focus:bg-white focus:ring-2 focus:ring-[#87B940]/15"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-slate-900"
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
          className="mt-1.5 w-full rounded-2xl border border-[#DCE6D7] bg-[#FBFCFA] px-4 py-3.5 text-slate-900 outline-none transition focus:border-[#87B940] focus:bg-white focus:ring-2 focus:ring-[#87B940]/15"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#244B32] px-4 py-3.5 font-semibold text-white transition hover:bg-[#356A46] hover:shadow-[0_10px_24px_rgba(36,75,50,0.14)] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? <Spinner label="Connexion..." /> : "Se connecter"}
      </button>
    </form>
  );
}
