"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  addItem,
  cartCount,
  getCart,
  removeItem,
  saveCart,
  subscribeToCart,
  updateQuantity,
} from "@/lib/services/cart";
import type { CartItem } from "@/lib/types";

const GUEST_KEY = "nepal-mart-cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  loading: boolean;
  add: (item: CartItem) => Promise<void>;
  setQuantity: (item: CartItem, quantity: number) => Promise<void>;
  remove: (item: CartItem) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readGuestCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { success, error } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mergedFor = useRef<string | null>(null);

  // Guest cart lives in localStorage; signed-in cart lives in Firestore.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setItems(readGuestCart());
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToCart(user.uid, (remote) => {
      setItems(remote);
      setLoading(false);
    });

    // Merge the guest cart into the account exactly once per sign-in.
    if (mergedFor.current !== user.uid) {
      mergedFor.current = user.uid;
      void (async () => {
        const guest = readGuestCart();
        if (!guest.length) return;
        const remote = await getCart(user.uid);
        const merged = guest.reduce((acc, item) => addItem(acc, item), remote);
        await saveCart(user.uid, merged);
        window.localStorage.removeItem(GUEST_KEY);
      })().catch(() => error("Could not sync your cart."));
    }

    return () => unsub();
  }, [user, authLoading, error]);

  const persist = useCallback(
    async (next: CartItem[]) => {
      setItems(next);
      if (user) {
        await saveCart(user.uid, next);
      } else {
        window.localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      }
    },
    [user]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      loading,
      async add(item) {
        await persist(addItem(items, item));
        success("Added to cart");
      },
      async setQuantity(item, quantity) {
        await persist(updateQuantity(items, item, quantity));
      },
      async remove(item) {
        await persist(removeItem(items, item));
        success("Removed from cart");
      },
      async clear() {
        await persist([]);
      },
    }),
    [items, loading, persist, success]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
