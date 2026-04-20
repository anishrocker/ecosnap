import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FeedbackPage() {
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("feedback_ticket")
    .select("id,message,status,created_at,item_id")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1>Feedback</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>When</th>
            <th>Status</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px 0" }}>{r.created_at}</td>
              <td>{r.status}</td>
              <td>{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows?.length ? <p style={{ marginTop: 16, color: "#666" }}>No feedback tickets.</p> : null}
    </div>
  );
}
