import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Short-lived signed URLs. RLS decides: visitors only get URLs for images of APPROVED projects. */
export async function signedImageUrls(paths: (string | null)[]): Promise<Record<string, string>> {
  const wanted = paths.filter((p): p is string => Boolean(p));
  if (wanted.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from("project-images").createSignedUrls(wanted, 60 * 60);
  const out: Record<string, string> = {};
  data?.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}
