import { redirect } from "next/navigation";
import { isAdminSessionAuthenticated } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const isAuthenticated = await isAdminSessionAuthenticated();

  if (isAuthenticated) {
    redirect("/studio/drafts");
  }

  redirect("/studio/login");
}
