import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditClient from "./profile-edit-client";

export default async function MyPageEdit() {
  const user = await requireServerUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: userRow }, { data: profile }] = await Promise.all([
    supabase.from("users").select("gender").eq("id", user.id).maybeSingle(),
    supabase
      .from("male_profiles")
      .select("id,nickname,age,prefecture,job,income_range,height,hobbies,appeal")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return <EditClient gender={userRow?.gender ?? null} initialProfile={profile ?? null} />;
}

