import HomeHero from "./home-hero";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Row = {
  rank: number;
  profile_id: string;
  nickname: string;
  score: number;
  n?: number;
  photo_url: string | null;
};

async function getRankingPreview(): Promise<{ top3: Row[]; more: Row[] }> {
  const supabase = await createSupabaseServerClient();
  const { data: ranking } = await supabase
    .from("male_ranking")
    .select("profile_id,nickname,vote_count,bayes_score")
    .order("bayes_score", { ascending: false })
    .limit(9);
  const rows = (ranking ?? []) as any[];
  const ids = rows.map((r) => r.profile_id);
  const { data: photos } = ids.length
    ? await supabase
        .from("photos")
        .select("profile_id,storage_path,is_main,order_index")
        .in("profile_id", ids)
        .order("is_main", { ascending: false })
        .order("order_index", { ascending: true })
    : { data: [] as any[] };
  const main = new Map<string, string>();
  for (const p of (photos ?? []) as any[]) {
    if (!main.has(p.profile_id)) main.set(p.profile_id, p.storage_path);
  }
  const mapped: Row[] = rows.map((r, idx) => ({
    rank: idx + 1,
    profile_id: r.profile_id,
    nickname: r.nickname,
    score: Number(r.bayes_score ?? 0),
    n: r.vote_count,
    photo_url: main.get(r.profile_id)
      ? supabase.storage.from("profile-photos").getPublicUrl(main.get(r.profile_id)!).data.publicUrl
      : null,
  }));
  return { top3: mapped.slice(0, 3), more: mapped.slice(3, 9) };
}

export default async function HomePage() {
  const { top3, more } = await getRankingPreview();
  return <HomeHero top3={top3} more={more} />;
}
