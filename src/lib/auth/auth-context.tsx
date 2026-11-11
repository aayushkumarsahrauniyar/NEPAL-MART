"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ensureUserProfile, subscribeToUserProfile } from "@/lib/services/users";
import type { Role, UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);



export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claimRole, setClaimRole] = useState<Role>("customer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      unsubProfile?.();
      unsubProfile = undefined;

      if (!nextUser) {
        setProfile(null);
        setClaimRole("customer");
        return;
      }

      unsubProfile = subscribeToUserProfile(nextUser.uid, (p) => setProfile(p));

      // Admin rights come from the custom claim set by Cloud Functions. The
      // users/{uid}.role field is only a display mirror and never grants access.
      void (async () => {
        try {
          const token = await nextUser.getIdTokenResult(true);
          setClaimRole(token.claims.admin === true ? "admin" : "customer");
        } catch {
          setClaimRole("customer");
        }
      })();
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: claimRole === "admin",
      async register(email, password, displayName) {
        const auth = getFirebaseAuth();
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) await updateProfile(cred.user, { displayName: displayName.trim() });
        await ensureUserProfile({
          uid: cred.user.uid,
          email: cred.user.email ?? email,
          displayName: displayName.trim(),
          emailVerified: cred.user.emailVerified,
        });
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Verification email is best-effort; the user can resend it later.
        }
        return cred.user;
      },
      async login(email, password) {
        const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
        return cred.user;
      },
      async loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const cred = await signInWithPopup(getFirebaseAuth(), provider);
        await ensureUserProfile({
          uid: cred.user.uid,
          email: cred.user.email ?? "",
          displayName: cred.user.displayName ?? "",
          photoURL: cred.user.photoURL ?? undefined,
          emailVerified: cred.user.emailVerified,
        });
        return cred.user;
      },
      async logout() {
        await signOut(getFirebaseAuth());
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      },
      async resendVerification() {
        if (getFirebaseAuth().currentUser) await sendEmailVerification(getFirebaseAuth().currentUser!);
      },
      async refreshProfile() {
        const current = getFirebaseAuth().currentUser;
        if (!current) return;
        await current.reload();
        await ensureUserProfile({
          uid: current.uid,
          email: current.email ?? "",
          displayName: current.displayName ?? "",
          emailVerified: current.emailVerified,
        });
      },
    }),
    [user, profile, claimRole, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
