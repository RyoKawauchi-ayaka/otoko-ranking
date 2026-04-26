import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.redirect(new URL("/login", req.url), { status: 303 });

  const form = await req.formData();
  const profileId = String(form.get("profileId") ?? "");
  if (!profileId) return NextResponse.redirect(new URL("/admin", req.url), { status: 303 });

  const { data: me } = await supabase.from("users").select("role").eq("id", userRes.user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.redirect(new URL("/feed", req.url), { status: 303 });

  const admin = createSupabaseAdminClient();

  const { data: photos } = await admin
    .from("photos")
    .select("storage_path")
    .eq("profile_id", profileId);

  await admin.from("male_profiles").delete().eq("id", profileId);

  const paths = (photos ?? []).map((p: any) => p.storage_path as string).filter(Boolean);
  if (paths.length) {
    await admin.storage.from("profile-photos").remove(paths);
  }

  return NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
}

