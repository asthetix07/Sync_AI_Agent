"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import HomeView from "@/components/HomeView";
import SignupDialog from "@/components/SignupDialog";

const AUTH_STORAGE_KEY = "sync_ai_google_auth_user";

export default function Page() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ── Verify auth state on mount via httpOnly cookie ─────────
  useEffect(() => {
    const controller = new AbortController();

    async function checkAuth() {
      try {
        const me = await getMe(controller.signal);
        if (me) {
          setIsLoggedIn(true);
          window.localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              name: me.name,
              email: me.email,
              profile_url: me.profile_url,
            })
          );
          // Authenticated user — redirect to /chat
          router.replace("/chat");
          return;
        } else {
          setIsLoggedIn(false);
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          setShowLoginDialog(true);
        }
      } catch {
        setIsLoggedIn(false);
        setShowLoginDialog(true);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();

    return () => controller.abort();
  }, [router]);

  // Show nothing while checking auth (prevents flash)
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-text-ghost)', borderTopColor: 'var(--color-text-secondary)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <HomeView
          onSend={() => {
            // Unauthenticated users can't send — prompt login
            setShowLoginDialog(true);
          }}
          isLoggedIn={isLoggedIn}
        />
        {!isLoggedIn && !showLoginDialog && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-40">
            <button
              onClick={() => setShowLoginDialog(true)}
              className="px-6 py-3 rounded-full font-semibold shadow-lg transition-colors cursor-pointer"
              style={{ background: 'var(--login-btn-bg)', color: 'var(--login-btn-text)' }}
            >
              Login to <span className="font-sync-ai font-bold">Sync AI</span>
            </button>
          </div>
        )}
      </main>

      <SignupDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onSuccess={() => {
          setIsLoggedIn(true);
          // Redirect to /chat after successful login
          window.location.href = "/chat";
        }}
      />
    </div>
  );
}
