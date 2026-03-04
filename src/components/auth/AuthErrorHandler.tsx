"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Detects Supabase auth errors in the URL hash (e.g. otp_expired, access_denied)
 * and redirects to the auth page with a clean error param.
 */
export function AuthErrorHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.slice(1));
    const error = params.get("error");
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");

    if (error || errorCode) {
      const search = new URLSearchParams();
      if (errorCode) search.set("error", errorCode);
      else if (error) search.set("error", error);
      if (errorDescription) search.set("message", errorDescription);

      router.replace(`/auth?${search.toString()}`);
    }
  }, [router, pathname]);

  return null;
}
