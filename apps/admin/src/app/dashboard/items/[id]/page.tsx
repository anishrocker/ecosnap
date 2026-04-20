import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ItemEditor } from "./ui";

export default async function ItemEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase.from("item").select("*").eq("id", id).single();
  if (!item) notFound();

  const { data: aliases } = await supabase.from("item_search_alias").select("*").eq("item_id", id);
  const { data: flow } = await supabase
    .from("item_flow")
    .select("*")
    .eq("item_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: rules } = await supabase.from("disposition_rule").select("*").eq("item_id", id);
  const { data: jurisdictions } = await supabase.from("jurisdiction").select("id,name,slug");

  return (
    <ItemEditor
      item={item}
      aliases={aliases ?? []}
      flow={flow}
      rules={rules ?? []}
      jurisdictions={jurisdictions ?? []}
    />
  );
}
