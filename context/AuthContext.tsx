"use client";

/**
 * Fournit l'état d'authentification à toute l'application via le Context
 * React. Centraliser cet état ici évite de refaire un appel /api/auth/me
 * dans chaque page qui en a besoin.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { authService } from "@/services/auth-service";
import type { LoginCredentials, User } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  /** true tant que la session initiale n'a pas encore été vérifiée. */
  isInitializing: boolean;
  isAuthenticating: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    authService.getCurrentUser().then((currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        setIsInitializing(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const authenticatedUser = await authService.login(credentials);
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isInitializing, isAuthenticating, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook d'accès à l'état d'authentification. Doit être utilisé sous un
 * <AuthProvider> (posé dans app/layout.tsx).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider.");
  }
  return context;
}
