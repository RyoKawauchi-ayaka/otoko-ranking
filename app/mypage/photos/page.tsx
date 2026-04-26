import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PhotosClient from "./photos-client";

export default async function MyPhotosPage() {
  const user = await requireServerUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: userRow }, { data: profile }] = await Promise.all([
    supabase.from("users").select("gender").eq("id", user.id).maybeSingle(),
    supabase.from("male_profiles").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  const profileId = profile?.id ?? null;
  const { data: photos } = profileId
    ? await supabase
        .from("photos")
        .select("id,profile_id,storage_path,is_main,order_index,created_at")
        .eq("profile_id", profileId)
        .order("is_main", { ascending: false })
        .order("order_index", { ascending: true })
    : { data: [] as any[] };

  return (
    <PhotosClient
      gender={userRow?.gender ?? null}
      profileId={profileId}
      initialPhotos={photos ?? []}
    />
  );
}

