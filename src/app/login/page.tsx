import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/primitives";
import { LoginForm } from "@/components/auth/login-form";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to your ${SITE_NAME} account to track orders, manage your wishlist and check out faster.`,
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Suspense fallback={<PageSpinner label="Loading sign in form" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
