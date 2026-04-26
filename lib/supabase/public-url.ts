import type { SupabaseClient } from "@supabase/supabase-js";

export function getProfilePhotoPublicUrl(supabase: SupabaseClient, path: string) {
  return supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
}

