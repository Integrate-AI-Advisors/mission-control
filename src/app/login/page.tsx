"use client";

import { createClient } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "integrate-ai.uk", // Restrict Google picker to workspace domain
        },
      },
    });
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-dark-surface border border-dark-border flex items-center justify-center shadow-panel">
            <svg viewBox="0 0 32 32" className="w-10 h-10">
              <rect width="32" height="32" rx="8" fill="#1a1a19" />
              <circle cx="8" cy="11" r="3" fill="#d97757" />
              <circle cx="18" cy="11" r="3" fill="#d97757" opacity="0.4" />
              <circle cx="8" cy="21" r="3" fill="#d97757" opacity="0.2" />
              <circle cx="18" cy="21" r="3" fill="#d97757" />
            </svg>
          </div>
        </div>

        <h1 className="font-serif text-2xl font-bold text-text-primary text-center mb-2">
          Mission Control
        </h1>
        <p className="text-text-muted text-sm text-center mb-8 font-mono">
          IntegrateAI Advisors
        </p>

        {error === "unauthorized" && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
            <p className="text-red-400 text-sm text-center">
              Access restricted to @integrate-ai.uk accounts only.
            </p>
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-dark-surface border border-dark-border rounded-lg px-4 py-3 text-text-primary hover:border-terra/30 hover:bg-dark-card transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-sm font-medium">Sign in with Google</span>
        </button>

        <p className="text-text-dim text-xs text-center mt-6 font-mono">
          @integrate-ai.uk accounts only
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
