import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "#111", color: "#fff", padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 24 }}>EcoSnap</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/dashboard" style={{ color: "#fff" }}>
            Items
          </Link>
          <Link href="/dashboard/feedback" style={{ color: "#fff" }}>
            Feedback
          </Link>
        </nav>
        <form action={logout} style={{ marginTop: 32 }}>
          <button type="submit" style={{ background: "#333", color: "#fff", border: 0, padding: "8px 12px" }}>
            Sign out
          </button>
        </form>
      </aside>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
