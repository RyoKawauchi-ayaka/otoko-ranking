import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_FEMALE_EMAIL = "demo.female@otoko-ranking.local";

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const body = (await req.json().catch(() => null)) as { seedVotes?: boolean } | null;
    const seedVotes = body?.seedVotes === true;
    const admin = createSupabaseAdminClient();

    // Find demo female user
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
    const femaleUser = (list?.users ?? []).find((u) => u.email?.toLowerCase() === DEMO_FEMALE_EMAIL.toLowerCase()) ?? null;
    if (!femaleUser) throw new Error("demo female user not found. Call /api/dev/bootstrap first.");

    // Ensure female has attributes + paid flag for testing
    const { error: upErr } = await admin
      .from("users")
      .upsert(
        {
          id: femaleUser.id,
          email: femaleUser.email ?? DEMO_FEMALE_EMAIL,
          gender: "female",
          role: "user",
          is_paid_user: true,
          age: 27,
          height: 160,
          job: "会社員",
        },
        { onConflict: "id" },
      );
    if (upErr) throw new Error(`users upsert failed: ${upErr.message}`);

    // デモで「評価」動作を確認しやすいように、デフォルトではデモ女性の投票をリセットする
    // （seedVotes=true のときのみ、ランキング/好み分析解放用の投票を投入する）
    if (!seedVotes) {
      const { data: existingVotes, error: evErr } = await admin
        .from("votes")
        .select("id")
        .eq("voter_id", femaleUser.id)
        .limit(5000);
      if (evErr) throw new Error(`votes select failed: ${evErr.message}`);
      const voteIds = (existingVotes ?? []).map((v: any) => String(v.id));
      if (voteIds.length) {
        const { error: delSelErr } = await admin.from("vote_feature_selections").delete().in("vote_id", voteIds);
        if (delSelErr) throw new Error(`vote_feature_selections delete failed: ${delSelErr.message}`);
      }
      const { error: delVotesErr } = await admin.from("votes").delete().eq("voter_id", femaleUser.id);
      if (delVotesErr) throw new Error(`votes delete failed: ${delVotesErr.message}`);
    }

    // Create additional demo male users + profiles
    const maleNames = ["アキラ", "ユウタ", "ケン", "ショウ", "リョウ", "タクミ", "レン", "ソウタ", "ハル", "ユウ", "カイト", "ナオ"];
    const prefectures = ["東京", "神奈川", "千葉", "埼玉", "大阪", "愛知", "福岡"];
    const jobs = ["営業", "エンジニア", "デザイナー", "公務員", "教師", "研究職", "看護師"];
    const incomes = ["300〜500", "500〜700", "700〜900", "900〜1200", null] as (string | null)[];

    const createdProfileIds: string[] = [];

    for (let i = 0; i < 12; i++) {
      const email = `demo.male${i + 1}@otoko-ranking.local`;
      const password = "DemoPass!12345";

      const existing = (list?.users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
      const user =
        existing ??
        (
          await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { demo: true },
          })
        ).data.user;
      if (!user) throw new Error(`failed to create demo male user ${email}`);

      const { error: uRowErr } = await admin
        .from("users")
        .upsert({ id: user.id, email: user.email ?? email, gender: "male", role: "user" }, { onConflict: "id" });
      if (uRowErr) throw new Error(`users upsert failed: ${uRowErr.message}`);

      const { data: mp, error: mpErr } = await admin.from("male_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (mpErr) throw new Error(`male_profiles select failed: ${mpErr.message}`);
      if (!mp) {
        const nickname = pick(maleNames, i) + (i + 1);
        const { data: ins, error: insErr } = await admin
          .from("male_profiles")
          .insert({
            user_id: user.id,
            nickname,
            age: 22 + (i % 15),
            prefecture: pick(prefectures, i),
            job: pick(jobs, i),
            income_range: pick(incomes as any, i),
            height: 165 + (i % 20),
            hobbies: ["映画", "旅行", "筋トレ", "カフェ"].slice(0, 2 + (i % 3)),
            appeal: "デモ用プロフィールです。",
          })
          .select("id")
          .single();
        if (insErr) throw new Error(`male_profiles insert failed: ${insErr.message}`);
        createdProfileIds.push(ins.id);
      } else {
        createdProfileIds.push(mp.id);
      }
    }

    // Optional: Seed votes to unlock ranking(10) and preferences(100)
    // （デモで「ロック解除済み状態」を確認したい場合のみ）

    const needTotal = 110;
    const existingTargets = [...createdProfileIds];
    const extraNeeded = Math.max(0, needTotal - existingTargets.length);
    const extraProfileIds: string[] = [];

    for (let i = 0; i < extraNeeded; i++) {
      const email = `demo.male.extra${i + 1}@otoko-ranking.local`;
      const password = "DemoPass!12345";

      const { data: created } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { demo: true },
      });
      const user = created.user;
      if (!user) continue;

      await admin.from("users").upsert({ id: user.id, email: user.email ?? email, gender: "male", role: "user" }, { onConflict: "id" });
      const { data: ins } = await admin
        .from("male_profiles")
        .insert({
          user_id: user.id,
          nickname: `デモ男${i + 100}`,
          age: 20 + (i % 25),
          prefecture: pick(prefectures, i + 3),
          job: pick(jobs, i + 2),
          income_range: pick(incomes as any, i + 1),
          height: 160 + (i % 25),
          hobbies: ["映画", "筋トレ"],
          appeal: "好み分析用デモデータです。",
        })
        .select("id")
        .single();
      if (ins?.id) extraProfileIds.push(ins.id);
    }

    const targetIds = [...existingTargets, ...extraProfileIds].slice(0, needTotal);

    let insertedVotes: any[] = [];
    let featureRows: { vote_id: string; tag_id: string }[] = [];
    if (seedVotes) {
      // Feature tags lookup
      const { data: tags, error: tagErr } = await admin.from("vote_feature_tags").select("id,slug");
      if (tagErr) throw new Error(`vote_feature_tags select failed: ${tagErr.message}`);
      const tagBySlug = new Map<string, string>((tags ?? []).map((t: any) => [t.slug, t.id]));
      const tagPools = [
        ["muscular", "fit", "clean"],
        ["salt_face", "kind", "clean"],
        ["strong_face", "fashionable", "funny"],
        ["smart", "clean", "kind"],
        ["tall", "fit", "fashionable"],
      ];

      // Insert votes + feature selections
      const voteRows = targetIds.map((tid, i) => ({
        voter_id: femaleUser.id,
        target_id: tid,
        rating: i % 5 === 0 ? "excellent" : i % 2 === 0 ? "good" : "normal",
      }));

      // upsert votes (ignore duplicates)
      const { data: vIns, error: votesErr } = await admin
        .from("votes")
        .upsert(voteRows as any, { onConflict: "voter_id,target_id" })
        .select("id,target_id");
      if (votesErr) throw new Error(`votes upsert failed: ${votesErr.message}`);
      insertedVotes = vIns ?? [];

      featureRows = [];
      for (const v of insertedVotes ?? []) {
        const idx = targetIds.indexOf(v.target_id);
        const pool = pick(tagPools, idx);
        for (const slug of pool) {
          const tagId = tagBySlug.get(slug);
          if (tagId) featureRows.push({ vote_id: v.id, tag_id: tagId });
        }
      }
      if (featureRows.length) {
        await admin.from("vote_feature_selections").upsert(featureRows as any, { onConflict: "vote_id,tag_id" });
      }
    }

    // Also seed a couple private profiles for first 3 males
    const privateRows = targetIds.slice(0, 3).map((pid, i) => ({
      profile_id: pid,
      education: i === 0 ? "国立大" : i === 1 ? "私立大" : "専門学校",
      company_size: i === 0 ? "大手" : "中小",
      personality: i === 2 ? "落ち着いている" : "明るい",
      private_note: "高評価の女性のみ閲覧できるデモ項目です。",
    }));
    await admin.from("male_private_profiles").upsert(privateRows as any, { onConflict: "profile_id" });

    return NextResponse.json({
      ok: true,
      seeded: {
        female_user_id: femaleUser.id,
        target_count: targetIds.length,
        votes: insertedVotes?.length ?? 0,
        features: featureRows.length,
        private_profiles: privateRows.length,
        paid: true,
      },
      mode: seedVotes ? "seedVotes=true (unlock mode)" : "seedVotes=false (vote demo mode)",
      note: "Photos are not auto-uploaded. Use /mypage/photos to upload for a male user if needed.",
    });
  } catch (e) {
    return NextResponse.json({ error: publicErrorMessage(e, "seed failed") }, { status: 500 });
  }
}

