"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { getFriendlyError } from "@/lib/firebase/errors";
import { isValidEmail, validateRequired } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";
import { Button, ErrorBanner, FieldError } from "@/components/ui/primitives";
import { SITE_NAME } from "@/lib/constants";

/**
 * Redirect target must be a same-site path. Anything absolute ("//evil.com",
 * "https://…") is discarded so the login form cannot be used as an open redirect.
 */
export function safeNextPath(raw: string | null, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle, user, loading } = useAuth();
  const toast = useToast();

  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"password" | "google" | null>(null);

  // Already signed in (e.g. session persisted) → skip the form entirely.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (validateRequired(email, "Email")) nextErrors.email = "Email is required.";
    else if (!isValidEmail(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Password is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting("password");
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.replace(next);
    } catch (error) {
      const message = getFriendlyError(error);
      // Credential errors belong next to the fields; everything else is a banner.
      if ((error as { code?: string })?.code?.includes("credential") || (error as { code?: string })?.code?.includes("password")) {
        setErrors({ email: "Incorrect email or password.", password: "Incorrect email or password." });
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setSubmitting("google");
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google.");
      router.replace(next);
    } catch (error) {
      setFormError(getFriendlyError(error));
    } finally {
      setSubmitting(null);
    }
  }

  const busy = submitting !== null;

  return (
    <div className="w-full max-w-md">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to {SITE_NAME}</h1>
          <p className="mt-1 text-sm text-muted">Track orders, save favourites and check out faster.</p>
        </div>

        {formError && (
          <div className="mb-4">
            <ErrorBanner message={formError} />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={busy}
            />
            <div id="email-error">
              <FieldError>{errors.email}</FieldError>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="label mb-0">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="input pr-16"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-medium text-muted hover:surface-2"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div id="password-error">
              <FieldError>{errors.password}</FieldError>
            </div>
          </div>

          <Button type="submit" className="w-full" loading={submitting === "password"} disabled={busy}>
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-[rgb(var(--border))]" />
          OR
          <span className="h-px flex-1 bg-[rgb(var(--border))]" />
        </div>

        <Button type="button" variant="secondary" className="w-full" onClick={handleGoogle} loading={submitting === "google"} disabled={busy}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted">
          New to {SITE_NAME}?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
