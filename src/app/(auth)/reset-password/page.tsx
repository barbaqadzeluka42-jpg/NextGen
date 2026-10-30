import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "ახალი პაროლი" };

export default async function ResetPasswordPage() {
  const viewer = await getViewer(); // the recovery link signs the user in temporarily
  if (!viewer) {
    return (
      <>
        <h1 className="text-2xl font-extrabold">ბმულს ვადა გაუვიდა</h1>
        <p className="mt-2 text-sm text-muted-foreground">პაროლის აღდგენის ბმული არასწორია ან ვადა გაუვიდა.</p>
        <Link href="/forgot-password" className="mt-5 inline-block font-semibold text-primary hover:underline">მოითხოვე ახალი ბმული</Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-extrabold">ახალი პაროლი</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">დააყენე ახალი პაროლი შენი ანგარიშისთვის.</p>
      <ResetForm />
    </>
  );
}
