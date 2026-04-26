"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PhotoRow = {
  id: string;
  profile_id: string;
  storage_path: string;
  is_main: boolean;
  order_index: number;
  created_at: string;
};

export default function PhotosClient({
  gender,
  profileId,
  initialPhotos,
}: {
  gender: string | null;
  profileId: string | null;
  initialPhotos: PhotoRow[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canOperate = gender === "male" && !!profileId && !busy;

  async function upload(file: File, isMain: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      if (gender !== "male") throw new Error("男性ユーザーのみ操作できます");
      if (!profileId) throw new Error("先にプロフィールを作成してください");
      if (file.size > 5 * 1024 * 1024) throw new Error("画像は最大5MBです");
      if (photos.length >= 6) throw new Error("写真は最大6枚です");

      const ext = file.name.split(".").pop() || "jpg";
      const name = `profiles/${profileId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("profile-photos").upload(name, file, {
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      if (isMain) {
        await supabase.from("photos").update({ is_main: false }).eq("profile_id", profileId);
      }

      const { data: ins, error: insErr } = await supabase
        .from("photos")
        .insert({
          profile_id: profileId,
          storage_path: name,
          is_main: isMain || photos.length === 0,
          order_index: photos.length,
        })
        .select("id,profile_id,storage_path,is_main,order_index,created_at")
        .single();
      if (insErr) throw insErr;

      setPhotos((p) => {
        const next = [...p, ins as PhotoRow];
        next.sort((a, b) => (a.is_main === b.is_main ? a.order_index - b.order_index : a.is_main ? -1 : 1));
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(photo: PhotoRow) {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      if (gender !== "male") throw new Error("男性ユーザーのみ操作できます");
      if (!profileId) throw new Error("プロフィールが未作成です");

      const { error: dbErr } = await supabase.from("photos").delete().eq("id", photo.id);
      if (dbErr) throw dbErr;

      await supabase.storage.from("profile-photos").remove([photo.storage_path]);

      setPhotos((p) => p.filter((x) => x.id !== photo.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onSetMain(photo: PhotoRow) {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      if (gender !== "male") throw new Error("男性ユーザーのみ操作できます");
      if (!profileId) throw new Error("プロフィールが未作成です");

      await supabase.from("photos").update({ is_main: false }).eq("profile_id", profileId);
      const { error: upErr } = await supabase.from("photos").update({ is_main: true }).eq("id", photo.id);
      if (upErr) throw upErr;

      setPhotos((p) =>
        p
          .map((x) => (x.id === photo.id ? { ...x, is_main: true } : { ...x, is_main: false }))
          .sort((a, b) => (a.is_main === b.is_main ? a.order_index - b.order_index : a.is_main ? -1 : 1)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">写真管理</h1>
        <Link className="text-sm underline" href="/mypage">
          戻る
        </Link>
      </div>

      <div className="rounded-xl border bg-neutral-50 p-4 text-sm text-neutral-800">
        <div className="font-semibold">写真登録のルール</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
          <li>加工した写真（過度なフィルター、合成、別人に見える編集など）は登録しないでください。</li>
          <li>登録できるのは「ご本人の写真」のみです（他人の写真・無断転載は禁止）。</li>
          <li>
            不適切な写真（公序良俗に反する、露出が過度、嫌がらせ、個人情報が写っている等）を登録した場合、
            <span className="font-semibold text-red-700">アカウント削除</span>になる可能性があります。
          </li>
          <li>露出が過度な写真はNGですが、<span className="font-semibold">筋肉が写っている</span>程度は問題ありません。</li>
        </ul>
      </div>

      {!profileId ? (
        <p className="rounded-md border bg-yellow-50 p-3 text-sm text-yellow-900">
          先に `プロフィール編集` で基本情報を作成してください。
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">アップロード</div>
          <div className="text-xs text-neutral-600">{photos.length}/6</div>
        </div>
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`group relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition ${
                canOperate ? "bg-white hover:bg-neutral-50 hover:shadow-sm" : "cursor-not-allowed bg-neutral-50 opacity-70"
              }`}
            >
              <div className="text-sm font-semibold text-neutral-900">メイン写真</div>
              <div className="text-xs text-neutral-600">クリックして画像を選択</div>
              <span className="mt-2 inline-flex w-fit items-center rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-neutral-800">
                ファイルを選択
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={!canOperate}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f, true);
                  e.currentTarget.value = "";
                }}
              />
            </label>

            <label
              className={`group relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition ${
                canOperate ? "bg-white hover:bg-neutral-50 hover:shadow-sm" : "cursor-not-allowed bg-neutral-50 opacity-70"
              }`}
            >
              <div className="text-sm font-semibold text-neutral-900">サブ写真</div>
              <div className="text-xs text-neutral-600">クリックして画像を選択</div>
              <span className="mt-2 inline-flex w-fit items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-neutral-900 ring-1 ring-neutral-300 transition group-hover:bg-neutral-100">
                ファイルを選択
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={!canOperate}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f, false);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => {
          const url = supabase
            ? supabase.storage.from("profile-photos").getPublicUrl(p.storage_path).data.publicUrl
            : "";
          return (
            <div key={p.id} className="rounded-xl border p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                {url ? <Image src={url} alt="" fill className="object-cover" sizes="33vw" /> : null}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50"
                  onClick={() => void onSetMain(p)}
                  disabled={busy || p.is_main}
                >
                  {p.is_main ? "メイン" : "メインにする"}
                </button>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs font-medium text-red-600 disabled:opacity-50"
                  onClick={() => void onDelete(p)}
                  disabled={busy}
                >
                  削除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

