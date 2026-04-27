import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase.from("item").select("id,title,slug,status").order("updated_at", { ascending: false });
  const itemRows = items ?? [];
  const publishedCount = itemRows.filter((item) => item.status === "published").length;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        className="admin-card"
        style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Catalog items</h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>Draft and published recycling entries with trust metadata.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge badge-published">{publishedCount} published</span>
          <span className="badge badge-draft">{itemRows.length - publishedCount} draft</span>
        </div>
      </section>

      <section className="admin-card" style={{ overflow: "hidden" }}>
        {itemRows.length === 0 ? (
          <div style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>No items yet</h2>
            <p style={{ marginBottom: 0, color: "var(--text-muted)" }}>Insert seed data or create rows in Supabase to start publishing guidance.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {itemRows.map((i) => (
              <li key={i.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <Link
                  href={`/dashboard/items/${i.id}`}
                  style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
                >
                  <span style={{ display: "grid", gap: 2 }}>
                    <strong style={{ color: "var(--text)" }}>{i.title}</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{i.slug}</span>
                  </span>
                  <span className={`badge ${i.status === "published" ? "badge-published" : "badge-draft"}`}>{i.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
