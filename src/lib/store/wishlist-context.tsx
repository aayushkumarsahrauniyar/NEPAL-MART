"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { getWishlist, saveWishlist, subscribeToWishlist, toggleWishlistId } from "@/lib/services/wishlist";

const GUEST_KEY = "nepal-mart-wishlist";

interface WishlistContextValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readGuest(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(GUEST_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { success } = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIds(readGuest());
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToWishlist(user.uid, (remote) => {
      setIds(remote);
      setLoading(false);
    });
    void (async () => {
      const guest = readGuest();
      if (!guest.length) return;
      const remote = await getWishlist(user.uid);
      const merged = Array.from(new Set([...remote, ...guest]));
      await saveWishlist(user.uid, merged);
      window.localStorage.removeItem(GUEST_KEY);
    })();
    return () => unsub();
  }, [user, authLoading]);

  const persist = useCallback(
    async (next: string[]) => {
      setIds(next);
      if (user) await saveWishlist(user.uid, next);
      else window.localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    },
    [user]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      loading,
      has: (productId: string) => ids.includes(productId),
      async toggle(productId: string) {
        const next = toggleWishlistId(ids, productId);
        await persist(next);
        success(next.includes(productId) ? "Saved to wishlist" : "Removed from wishlist");
      },
      async remove(productId: string) {
        await persist(ids.filter((id) => id !== productId));
      },
    }),
    [ids, loading, persist, success]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
