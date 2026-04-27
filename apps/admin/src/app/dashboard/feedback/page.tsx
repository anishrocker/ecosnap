import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FeedbackPage() {
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("feedback_ticket")
    .select("id,message,status,created_at,item_id")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="admin-card" style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 30 }}>Feedback queue</h1>
      <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>
        Recent user-reported issues from the EcoSnap app.
      </p>

      {!rows?.length ? (
        <div className="admin-card" style={{ marginTop: 18, padding: 18, textAlign: "center", color: "var(--text-muted)" }}>
          No feedback tickets yet.
        </div>
      ) : (
        <div className="admin-card" style={{ marginTop: 18, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--surface-muted)" }}>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>When</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>Status</th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: 13 }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className={`badge ${r.status === "open" ? "badge-warning" : "badge-published"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
