import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/same-origin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.redirect(new URL("/login", req.url), { status: 303 });

  const form = await req.formData();
  const reportId = String(form.get("reportId") ?? "");
  if (!reportId) return NextResponse.redirect(new URL("/admin", req.url), { status: 303 });

  const { data: me } = await supabase.from("users").select("role").eq("id", userRes.user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.redirect(new URL("/feed", req.url), { status: 303 });

  await supabase.from("reports").update({ resolved_at: new Date().toISOString() }).eq("id", reportId);
  return NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
}

