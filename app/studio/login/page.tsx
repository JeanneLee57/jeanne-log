import { redirect } from "next/navigation";
import { isAdminSessionAuthenticated } from "@/lib/auth/admin-session";
import { StudioLoginForm } from "@/components/studio/StudioLoginForm";

export const dynamic = "force-dynamic";

export default async function StudioLoginPage() {
  const isAuthenticated = await isAdminSessionAuthenticated();

  if (isAuthenticated) {
    redirect("/studio/drafts");
  }

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          Studio
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Admin Login
        </h1>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          `.env`에 저장된 관리자 비밀번호로 스튜디오에 로그인합니다.
        </p>
      </div>

      <StudioLoginForm />
    </section>
  );
}
