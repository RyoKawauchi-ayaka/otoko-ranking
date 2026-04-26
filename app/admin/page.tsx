import Link from "next/link";
import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReportRow = {
  id: string;
  target_profile_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
};

export default async function AdminPage() {
  const user = await requireServerUser();
  const supabase = await createSupabaseServerClient();

  const { data: me } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-6">
        <p className="text-sm text-red-600">管理者権限がありません。</p>
        <Link className="text-sm underline" href="/feed">
          フィードへ
        </Link>
      </main>
    );
  }

  const { data: reports, error } = await supabase
    .from("reports")
    .select("id,target_profile_id,reporter_id,reason,created_at,resolved_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-6">
        <p className="text-sm text-red-600">{error.message}</p>
      </main>
    );
  }

  const rows = (reports ?? []) as ReportRow[];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">管理画面（通報）</h1>
        <Link className="text-sm underline" href="/feed">
          フィード
        </Link>
      </div>

      {!rows.length ? (
        <p className="text-sm text-neutral-600">未解決の通報はありません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border p-4">
              <div className="text-xs text-neutral-600">{new Date(r.created_at).toLocaleString()}</div>
              <div className="mt-2 text-sm">{r.reason}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Link className="underline" href={`/profile/${r.target_profile_id}`}>
                  対象プロフィール
                </Link>
                <form action="/api/admin/resolve-report" method="post">
                  <input type="hidden" name="reportId" value={r.id} />
                  <button className="rounded-md border px-2 py-1 font-medium" type="submit">
                    解決にする
                  </button>
                </form>
                <form action="/api/admin/delete-profile" method="post">
                  <input type="hidden" name="profileId" value={r.target_profile_id} />
                  <button className="rounded-md border px-2 py-1 font-medium text-red-600" type="submit">
                    プロフィール削除
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

