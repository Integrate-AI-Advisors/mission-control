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
          hd: "integrate-ai.uk",
        },
      },
    });
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center relative overflow-hidden">
      {/* Subtle terra gradient orb behind card */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-terra/[0.03] blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm mx-4 relative z-10">
        {/* Dot Matrix Logo with breathing animation */}
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-[#1A1614] flex items-center justify-center shadow-panel">
            <svg viewBox="0 0 64 64" className="w-16 h-16">
              <rect width="64" height="64" rx="14" fill="#1A1614" />
              {/* Row 1 — staggered breathing */}
              <circle cx="14" cy="22" r="5.5" fill="#D97757" className="animate-breathe" style={{ animationDelay: "0s" }} />
              <circle cx="26" cy="22" r="5.5" fill="#4A2E24" className="animate-breathe" style={{ animationDelay: "0.4s" }} />
              <circle cx="38" cy="22" r="5.5" fill="#6B3D2E" className="animate-breathe" style={{ animationDelay: "0.8s" }} />
              <circle cx="50" cy="22" r="5.5" fill="#D97757" className="animate-breathe" style={{ animationDelay: "1.2s" }} />
              {/* Row 2 */}
              <circle cx="14" cy="40" r="5.5" fill="#4A2E24" className="animate-breathe" style={{ animationDelay: "1.6s" }} />
              <circle cx="26" cy="40" r="5.5" fill="#D97757" className="animate-breathe" style={{ animationDelay: "2.0s" }} />
              <circle cx="38" cy="40" r="5.5" fill="#D97757" className="animate-breathe" style={{ animationDelay: "2.4s" }} />
              <circle cx="50" cy="40" r="5.5" fill="#6B3D2E" className="animate-breathe" style={{ animationDelay: "2.8s" }} />
            </svg>
          </div>
        </div>

        {/* Brand label */}
        <p className="font-mono text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-terra text-center mb-3">
          Mission Control
        </p>

        {/* Heading — serif, never bold */}
        <h1 className="font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] text-text-primary text-center leading-[1.12]">
          Integrate<span className="text-terra">AI</span>
        </h1>

        {/* Subtitle — serif italic */}
        <p className="font-serif italic text-[0.95rem] text-text-muted text-center mt-2 mb-10">
          Intelligence layers for business
        </p>

        {/* Error banner */}
        {error === "unauthorized" && (
          <div className="bg-[rgba(194,91,86,0.08)] border border-brand-red/20 rounded-card px-4 py-3 mb-6">
            <p className="text-brand-red text-sm text-center font-sans">
              Access restricted to @integrate-ai.uk accounts only.
            </p>
          </div>
        )}

        {/* Sign in button */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-dark-surface border border-dark-border rounded-card px-4 py-3.5 text-text-primary hover:border-terra/30 hover:bg-dark-card transition-all duration-300 group"
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
          <span className="text-sm font-medium font-sans">Sign in with Google</span>
        </button>

        {/* Domain restriction note */}
        <p className="font-mono text-[0.6rem] text-text-muted text-center mt-6 tracking-wide">
          @integrate-ai.uk accounts only
        </p>

        {/* Dot divider */}
        <div className="flex justify-center gap-2 mt-10">
          <span className="w-1.5 h-1.5 rounded-full bg-terra/30 animate-dot-pulse" style={{ animationDelay: "0s" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-terra/30 animate-dot-pulse" style={{ animationDelay: "0.3s" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-terra/30 animate-dot-pulse" style={{ animationDelay: "0.6s" }} />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-bg flex items-center justify-center">
          <div className="flex gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-terra/50 animate-breathe" />
            <span className="w-1.5 h-1.5 rounded-full bg-terra/50 animate-breathe" style={{ animationDelay: "0.5s" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-terra/50 animate-breathe" style={{ animationDelay: "1s" }} />
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
