import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "შესვლა" };

const ERRORS: Record<string, string> = {
  confirm: "დადასტურების ბმული არასწორია ან ვადა გაუვიდა. სცადე თავიდან.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  if (await getViewer()) redirect(safeNext(sp.next));
  return (
    <>
      <h1 className="text-2xl font-extrabold">სისტემაში შესვლა</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">კეთილი იყოს შენი დაბრუნება.</p>
      {sp.error && ERRORS[sp.error] && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{ERRORS[sp.error]}</p>}
      <LoginForm next={sp.next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">ჯერ არ გაქვს ანგარიში? <Link href="/register" className="font-semibold text-primary hover:underline">რეგისტრაცია</Link></p>
    </>
  );
}
