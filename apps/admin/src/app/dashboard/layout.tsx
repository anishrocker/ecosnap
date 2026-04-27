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
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          background: "linear-gradient(180deg, #123349 0%, #0f2739 100%)",
          color: "#fff",
          padding: 24,
          borderRight: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 20 }}>EcoSnap</div>
        <p style={{ margin: 0, marginBottom: 24, color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
          Admin dashboard
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/dashboard"
            style={{
              color: "#fff",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 600,
            }}
          >
            Items
          </Link>
          <Link
            href="/dashboard/feedback"
            style={{
              color: "#fff",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 600,
            }}
          >
            Feedback
          </Link>
        </nav>
        <form action={logout} style={{ marginTop: 32 }}>
          <button
            type="submit"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </aside>
      <main style={{ padding: 28 }}>{children}</main>
    </div>
  );
}
