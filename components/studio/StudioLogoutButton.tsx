"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function StudioLogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    await fetch("/api/auth/admin/logout", {
      method: "POST",
    });

    startTransition(() => {
      router.replace("/studio/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isPending}
      className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:border-white dark:hover:text-white"
    >
      {isPending ? "Leaving..." : "Logout"}
    </button>
  );
}
