"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/auth-context";
import { CartProvider } from "@/lib/store/cart-context";
import { WishlistProvider } from "@/lib/store/wishlist-context";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { initAnalyticsSafe } from "@/lib/firebase/client";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initAnalyticsSafe();
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>{children}</WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
