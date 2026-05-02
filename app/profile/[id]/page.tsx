import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LikeButton from "./like-button";
import ReportButton from "./report-button";

type MaleProfile = {
  id: string;
  nickname: string;
  age: number;
  prefecture: string;
  job: string;
  income_range: string | null;
  height: number | null;
  hobbies: string[];
  appeal: string | null;
};

type PhotoRow = {
  id: string;
  storage_path: string;
  is_main: boolean;
  order_index: number;
};

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const authUser = await requireServerUser();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: profile, error: pErr } = await supabase
    .from("male_profiles")
    .select("id,nickname,age,prefecture,job,income_range,height,hobbies,appeal")
    .eq("id", id)
    .maybeSingle();

  if (pErr) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-6">
        <p className="text-sm text-red-600">{pErr.message}</p>
        <Link className="text-sm underline" href="/feed">
          フィードへ戻る
        </Link>
      </main>
    );
  }
  if (!profile) notFound();

  const mp = profile as MaleProfile;

  const [{ data: viewerRow }, { data: myVotesHigh }] = await Promise.all([
    supabase.from("users").select("gender").eq("id", authUser.id).maybeSingle(),
    supabase
      .from("votes")
      .select("id")
      .eq("voter_id", authUser.id)
      .eq("target_id", mp.id)
      .in("rating", ["good", "excellent"])
      .limit(1),
  ]);

  const canSeePrivate =
    viewerRow?.gender === "female" && Array.isArray(myVotesHigh) && myVotesHigh.length > 0;

  const [{ data: photos }, { data: rankingRow }, { data: privateProfile }, { data: privatePhotos }] =
    await Promise.all([
      supabase
        .from("photos")
        .select("id,storage_path,is_main,order_index")
        .eq("profile_id", mp.id)
        .order("is_main", { ascending: false })
        .order("order_index", { ascending: true }),
      supabase.from("male_ranking").select("profile_id,vote_count,bayes_score").eq("profile_id", mp.id).maybeSingle(),
      canSeePrivate
        ? supabase
            .from("male_private_profiles")
            .select("education,company_size,personality,private_note")
            .eq("profile_id", mp.id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      canSeePrivate
        ? supabase
            .from("private_photos")
            .select("storage_path,order_index")
            .eq("profile_id", mp.id)
            .order("order_index", { ascending: true })
        : Promise.resolve({ data: [] } as any),
    ]);

  const ratingCount = (rankingRow as any)?.vote_count ?? 0;
  const bayes = Number((rankingRow as any)?.bayes_score ?? 0);

  const { count: higherCount } = await supabase
    .from("male_ranking")
    .select("profile_id", { count: "exact", head: true })
    .gt("bayes_score", bayes);
  const rank = higherCount != null ? higherCount + 1 : null;

  const photoRows = (photos ?? []) as PhotoRow[];
  const photoUrls = photoRows.map((p) => supabase.storage.from("profile-photos").getPublicUrl(p.storage_path).data.publicUrl);

  const privatePhotoUrls: string[] = [];
  if (canSeePrivate && privatePhotos?.length) {
    for (const row of privatePhotos as any[]) {
      const { data: signed } = await supabase.storage
        .from("profile-private-photos")
        .createSignedUrl(row.storage_path, 60 * 60);
      if (signed?.signedUrl) privatePhotoUrls.push(signed.signedUrl);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Link className="text-sm underline" href="/feed">
          ← 男性評価
        </Link>
        <Link className="text-sm underline" href="/ranking">
          ランキング
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            {photoUrls.length ? (
              photoUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                  <Image src={url} alt={`${mp.nickname}-${idx + 1}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 250px" />
                </div>
              ))
            ) : (
              <div className="col-span-3 flex aspect-square items-center justify-center rounded-xl bg-neutral-100 text-sm text-neutral-500">
                写真がありません
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border p-4">
          <div>
            <div className="text-xl font-semibold">
              {mp.nickname} <span className="text-sm font-normal text-neutral-600">{mp.age}歳</span>
            </div>
            <div className="mt-1 text-sm text-neutral-600">{mp.prefecture}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-neutral-50 p-2">
              <div className="text-xs text-neutral-600">職業</div>
              <div className="font-medium">{mp.job}</div>
            </div>
            <div className="rounded-lg bg-neutral-50 p-2">
              <div className="text-xs text-neutral-600">年収</div>
              <div className="font-medium">{mp.income_range ?? "-"}</div>
            </div>
            <div className="rounded-lg bg-neutral-50 p-2">
              <div className="text-xs text-neutral-600">身長</div>
              <div className="font-medium">{mp.height ? `${mp.height}cm` : "-"}</div>
            </div>
            <div className="rounded-lg bg-neutral-50 p-2">
              <div className="text-xs text-neutral-600">趣味</div>
              <div className="font-medium">
                {mp.hobbies?.length ? mp.hobbies.slice(0, 3).join(" / ") : "-"}
              </div>
            </div>
          </div>

          {mp.appeal ? (
            <div className="rounded-lg bg-neutral-50 p-3 text-sm">
              <div className="text-xs text-neutral-600">一言</div>
              <p className="mt-1 whitespace-pre-wrap">{mp.appeal}</p>
            </div>
          ) : null}

          {canSeePrivate && privateProfile ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-sm">
              <div className="text-xs font-semibold text-emerald-900">非公開プロフィール（高評価のあなたのみ）</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-neutral-600">学歴</div>
                  <div className="font-medium">{(privateProfile as any).education ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-600">会社規模</div>
                  <div className="font-medium">{(privateProfile as any).company_size ?? "-"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-neutral-600">性格</div>
                  <div className="font-medium">{(privateProfile as any).personality ?? "-"}</div>
                </div>
                {(privateProfile as any).private_note ? (
                  <div className="col-span-2">
                    <div className="text-xs text-neutral-600">メモ</div>
                    <p className="mt-1 whitespace-pre-wrap">{(privateProfile as any).private_note}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {canSeePrivate && privatePhotoUrls.length ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
              <div className="text-xs font-semibold text-emerald-900">プライベート写真</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {privatePhotoUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`private-${idx + 1}`}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-xs text-neutral-600">Bayesスコア</div>
              <div className="text-lg font-semibold">{bayes.toFixed(2)}</div>
              <div className="mt-1 text-xs text-neutral-600">評価数 {ratingCount}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-600">順位</div>
              <div className="text-lg font-semibold">{rank ? `#${rank}` : "-"}</div>
            </div>
          </div>

          <LikeButton targetId={mp.id} />
          <ReportButton targetProfileId={mp.id} />
        </div>
      </div>
    </main>
  );
}

