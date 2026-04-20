import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase.from("item").select("id,title,slug,status").order("updated_at", { ascending: false });

  return (
    <div>
      <h1>Items</h1>
      <p style={{ color: "#555" }}>Draft and published catalog entries.</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {(items ?? []).map((i) => (
          <li key={i.id} style={{ marginBottom: 8 }}>
            <Link href={`/dashboard/items/${i.id}`}>
              {i.title} <span style={{ color: "#888" }}>({i.status})</span>
            </Link>
          </li>
        ))}
      </ul>
      {items?.length === 0 ? <p>No items yet. Insert seed data or create rows in Supabase.</p> : null}
    </div>
  );
}
