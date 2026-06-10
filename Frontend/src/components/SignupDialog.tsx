"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { signUpWithGoogle } from "@/lib/api";

const AUTH_STORAGE_KEY = "sync_ai_google_auth_user";
const STATE_STORAGE_KEY = "sync_ai_google_oauth_state";

function createOAuthState() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

interface SignupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SignupDialog({ isOpen, onClose, onSuccess }: SignupDialogProps) {
  const [oauthState, setOauthState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isGoogleConfigured = Boolean(googleClientId);

  useEffect(() => {
    if (isOpen) {
      const storedState = window.sessionStorage.getItem(STATE_STORAGE_KEY);
      const nextState = storedState || createOAuthState();
      window.sessionStorage.setItem(STATE_STORAGE_KEY, nextState);
      setOauthState(nextState);
    }
  }, [isOpen]);

  const containerClassName = useMemo(
    () =>
      [
        "fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" "),
    [isOpen]
  );

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google did not return an identity token. Please try again.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signUpWithGoogle(
        credentialResponse.credential,
        oauthState
      );
      // Store only non-sensitive profile info (no tokens)
      window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          name: result.user.name,
          email: result.user.email,
          profile_url: result.user.profile_url,
        })
      );
      window.sessionStorage.removeItem(STATE_STORAGE_KEY);
      onSuccess();
    } catch {
      setError("Google signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={containerClassName} role="dialog" aria-modal="true" style={{ background: 'var(--color-overlay-login)' }}>
      <div className="w-full max-w-md rounded-lg p-8 shadow-2xl relative" style={{ border: '1px solid var(--color-border-secondary)', background: 'var(--color-bg-secondary)' }}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 transition-colors cursor-pointer"
          style={{ color: 'var(--color-text-tertiary)' }}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="mb-6 flex flex-col items-center">
          <h2 className="text-4xl font-sync-ai font-semibold tracking-widest" style={{ color: 'var(--color-text-primary)' }}>Sync AI</h2>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--color-text-tertiary)' }}>
            Use Google to continue to <span className="font-sync-ai">Sync AI</span>.
          </p>
        </div>

        <div className="flex min-h-11 items-center justify-center">
          {isGoogleConfigured && oauthState ? (
            <GoogleLogin
              nonce={oauthState}
              state={oauthState}
              text="signup_with"
              shape="rectangular"
              size="large"
              width="320"
              onSuccess={handleSuccess}
              onError={() => {
                setError("Google signup was cancelled or failed.");
              }}
            />
          ) : (
            <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              Google OAuth is not configured.
            </div>
          )}
        </div>

        {isSubmitting && (
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Verifying your Google account...
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm" style={{ color: 'var(--color-red-text-hover)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
