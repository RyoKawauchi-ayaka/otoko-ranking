import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DemoRole = "male" | "female";

const DEMO_USERS: Record<DemoRole, { email: string; password: string; gender: DemoRole }> = {
  female: { email: "demo.female@otoko-ranking.local", password: "DemoPass!12345", gender: "female" },
  male: { email: "demo.male@otoko-ranking.local", password: "DemoPass!12345", gender: "male" },
};

async function ensureUser(admin: ReturnType<typeof createSupabaseAdminClient>, role: DemoRole) {
  const { email, password, gender } = DEMO_USERS[role];

  // Find by email (admin only)
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
  const existing = (list?.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;

  const user = existing
    ? existing
    : (
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { demo: true },
        })
      ).data.user;

  if (!user) throw new Error("failed to create demo user");

  // Ensure public.users row (bypass RLS via service role)
  const { error: upsertErr } = await admin.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? email,
      gender,
      role: "user",
    },
    { onConflict: "id" },
  );
  if (upsertErr) throw new Error(`users upsert failed: ${upsertErr.message}`);

  if (role === "male") {
    // Ensure male profile exists so /feed, /ranking に出せる
    const { data: mp, error: mpErr } = await admin
      .from("male_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (mpErr) throw new Error(`male_profiles select failed: ${mpErr.message}`);
    if (!mp) {
      const { error: insErr } = await admin.from("male_profiles").insert({
        user_id: user.id,
        nickname: "デモ太郎",
        age: 28,
        prefecture: "東京",
        job: "エンジニア",
        income_range: "500〜700",
        height: 175,
        hobbies: ["映画", "筋トレ", "旅行"],
        appeal: "デモ用プロフィールです。写真がなくてもUI確認できます。",
      });
      if (insErr) throw new Error(`male_profiles insert failed: ${insErr.message}`);
    }
  }

  return { email, password };
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    // NOTE: ローカル開発のデモ用途。Originが空のケースもあるため厳密な拒否はしない。
    void req;

    const admin = createSupabaseAdminClient();
    const female = await ensureUser(admin, "female");
    const male = await ensureUser(admin, "male");

    return NextResponse.json({
      ok: true,
      demo: { female, male },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: publicErrorMessage(e, "bootstrap failed"),
      },
      { status: 500 },
    );
  }
}

