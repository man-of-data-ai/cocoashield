"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { defaultPathForProfile } from "@/lib/access-control";
import { userService } from "@/services/user-service";

export default function Home() {
  const router = useRouter();
  const { user, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    userService.me()
      .then((profile) => router.replace(defaultPathForProfile(profile)))
      .catch(() => router.replace("/login"));
  }, [isInitializing, user, router]);

  return <main className="flex min-h-screen items-center justify-center bg-[#F6F8F3]"><Spinner label="Ouverture de votre espace..." /></main>;
}
