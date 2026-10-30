import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Data portability: the signed-in user downloads everything stored about them. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "export failed" }, { status: 500 });

  return new NextResponse(JSON.stringify({ email: auth.user.email, ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nextgen-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
